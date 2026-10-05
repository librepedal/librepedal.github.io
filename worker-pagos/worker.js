// librepedal-pagos — cobro del Premium mensual de LibrePedal con Flow (flow.cl),
// depositado en la cuenta de Ciber Stak SpA. Cloudflare Worker, sin dependencias.
// Es el "worker de compras" que esperan voz-motor.js (_esPremium) y firestore.rules
// (premiumSinTocar()): el ÚNICO que escribe users/{uid}.premium = { activo, expira (ms), plan, fuente }.
//
// Historia: la versión 2 llegó por correo desde la otra cuenta (2026-10-05) y nunca
// estuvo en git. Revisada antes de publicarla, tenía estos problemas -- todos de plata:
//  1) GRAVE: confirmar() hacía JSON.parse(st.optional). La especificación oficial de
//     Flow (es-openApiFlow.yaml, PaymentStatus.optional) lo declara string pero su
//     ejemplo lo muestra como OBJETO; si llega objeto, JSON.parse revienta, el catch lo
//     tragaba y uid/plan quedaban en null -> Flow cobraba y el premium NUNCA se activaba.
//     Ahora se aceptan las dos formas (leerOptional).
//  2) El amigo del plan dúo se buscaba por usersPrivate.email, que cada usuario puede
//     escribir a su gusto (firestore.rules: usersPrivate solo exige strOk) -> alguien
//     podía "adueñarse" del correo de otro y quedarse con su regalo. Ahora el uid se
//     deriva del correo con la MISMA regla que worker-auth (cuDeEmail), que solo emite
//     tokens para correos verificados, y se exige que users/{uid} exista.
//  3) Dos confirmaciones simultáneas del mismo pago podían sumar los días dos veces
//     (leer-si-existe y escribir no eran atómicos). Ahora cada cuenta se acredita en un
//     commit atómico de Firestore con precondición: el premium y la marca "aplicado a
//     esta cuenta" se escriben juntos o no se escribe nada.
//
// Estados de Flow (es-openApiFlow.yaml, PaymentStatus.status):
//   1 pendiente de pago · 2 pagada · 3 rechazada · 4 anulada
//
// Planes (30 días cada uno; los precios INCLUYEN IVA, la SpA es afecta):
//   individual  $3.000  -> premium para quien paga
//   duo         $4.000  -> premium para quien paga y para la cuenta de emailAmigo
//
// Rutas:
//   POST /pago/crear      { uid, email, plan?: "individual"|"duo", emailAmigo? }  -> { url }
//   POST /flow/confirmar  (lo llama Flow, servidor a servidor) -> verifica y acredita
//   GET|POST /flow/volver (vuelve el navegador del usuario) -> redirige a la app
//
// Secretos (Cloudflare > Worker > Settings > Variables and Secrets, tipo "Secret";
// nunca en el repo, este repo es público):
//   FLOW_API_KEY, FLOW_SECRET_KEY, GCP_SA_JSON (JSON completo de la service account de Firebase)
// Variables normales (wrangler.toml):
//   FLOW_ENV = "sandbox" | "produccion"
//   FIREBASE_PROJECT_ID, PUBLIC_URL (sin "/" final), APP_RETURN_URL
//   PREMIUM_INDIVIDUAL / PREMIUM_DUO (opcionales, default 3000 / 4000)
//   FLOW_PAYMENT_METHOD (opcional): id del medio de pago en Flow ("Medios de pago" en el
//     panel). Sirve para dejar SOLO tarjetas: con el modelo de emisión declarado al SII
//     ("No emito boleta cuando recibo un pago electrónico", rige desde 2026-11-01), un
//     pago por transferencia SÍ exigiría emitir boleta a mano.

const FLOW_API = {
  sandbox: "https://sandbox.flow.cl/api",
  produccion: "https://www.flow.cl/api",
};

const FLOW_PAGADA = 2;

// Orígenes reales de la web (mismo patrón que worker-auth y worker-ia). Las rutas /flow/*
// las llama Flow o el navegador de vuelta, no fetch() desde una página: no usan CORS.
const ORIGENES_OK = ["https://librepedal.cl", "https://www.librepedal.cl", "https://librepedal-web.pages.dev"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origen = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGENES_OK.includes(origen) ? origen : ORIGENES_OK[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    try {
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      if (url.pathname === "/pago/crear" && request.method === "POST") return await crearPago(request, env, cors);
      if (url.pathname === "/flow/confirmar" && request.method === "POST") return await confirmar(request, env);
      if (url.pathname === "/flow/volver") return await volver(request, env);
      return new Response("No encontrado", { status: 404 });
    } catch (err) {
      console.error(err);
      // En /flow/confirmar un 500 hace que Flow reintente más tarde: es lo que queremos si
      // Firestore o Flow fallaron a medias (acreditar es idempotente, ver acreditarPago).
      return json({ error: "error_interno" }, 500, cors);
    }
  },
};

// ---------- utilidades ----------

// Misma regla que worker-auth/worker.js: el uid de Firebase Auth de cada usuario ES su
// `cu`, derivado del correo verificado. No inventar otra: tienen que coincidir.
function cuDeEmail(email) {
  return String(email).replace(/[^a-zA-Z0-9]/g, "_");
}

// Un uid válido solo tiene lo que produce cuDeEmail. Va dentro de una ruta de Firestore:
// nada de "/", "..", etc.
const UID_OK = /^[A-Za-z0-9_]{3,200}$/;
const esEmail = (e) => typeof e === "string" && e.length <= 120 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

function leerOptional(optional) {
  if (!optional) return {};
  if (typeof optional === "object") return optional;
  try {
    const o = JSON.parse(optional);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function json(obj, status = 200, cors = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function planes(env) {
  return {
    individual: { nombre: "individual", monto: Number(env.PREMIUM_INDIVIDUAL || 3000), dias: 30, cuentas: 1 },
    duo: { nombre: "dúo", monto: Number(env.PREMIUM_DUO || 4000), dias: 30, cuentas: 2 },
  };
}

// ---------- Flow ----------

// Flow: se ordenan los parámetros por nombre, se concatena nombre+valor de cada uno y se
// firma con HMAC-SHA256 usando la secretKey (es-openApiFlow.yaml, "¿Cómo firmar...?").
async function firmar(params, secret) {
  const base = Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(base));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function flow(env, method, path, params) {
  const all = { apiKey: env.FLOW_API_KEY, ...params };
  all.s = await firmar(all, env.FLOW_SECRET_KEY);
  const body = new URLSearchParams(all);
  const base = FLOW_API[env.FLOW_ENV] || FLOW_API.sandbox;
  const res = method === "GET"
    ? await fetch(`${base}${path}?${body}`)
    : await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
  const data = await res.json();
  if (!res.ok) throw new Error(`Flow ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function configOk(env) {
  return env.FLOW_API_KEY && env.FLOW_SECRET_KEY && env.GCP_SA_JSON && env.FIREBASE_PROJECT_ID && env.PUBLIC_URL;
}

async function crearPago(request, env, cors) {
  if (!configOk(env)) return json({ error: "pagos_no_configurados" }, 503, cors);
  const datos = await request.json().catch(() => ({}));
  const uid = typeof datos.uid === "string" ? datos.uid.trim() : "";
  const plan = typeof datos.plan === "string" ? datos.plan : "individual";
  const limpio = (e) => (typeof e === "string" ? e.trim() : "");
  const email = limpio(datos.email);
  const emailAmigo = limpio(datos.emailAmigo);
  if (!UID_OK.test(uid) || !esEmail(email)) return json({ error: "faltan_uid_o_email" }, 400, cors);
  if (!Object.prototype.hasOwnProperty.call(planes(env), plan)) return json({ error: "plan_invalido" }, 400, cors);
  const p = planes(env)[plan];

  const token = await googleToken(env);
  // Antes de cobrar: la cuenta que recibe el premium tiene que existir. Si no, el pago
  // quedaría cobrado sin nadie a quien acreditarlo.
  if (!(await firestoreGet(docUrl(env, `users/${uid}`), token))) return json({ error: "cuenta_inexistente" }, 404, cors);

  // Dúo: la segunda cuenta se busca ANTES de cobrar, para que nadie pague por un correo equivocado.
  let amigoUid = null;
  if (plan === "duo") {
    if (!esEmail(emailAmigo)) return json({ error: "falta_email_amigo" }, 400, cors);
    amigoUid = await uidPorEmail(env, token, emailAmigo);
    if (!amigoUid) return json({ error: "amigo_sin_cuenta" }, 404, cors);
    if (amigoUid === uid) return json({ error: "amigo_es_el_mismo" }, 400, cors);
  }

  const opcional = { uid, plan };
  if (amigoUid) opcional.amigoUid = amigoUid;
  const params = {
    // El uid NO va en la orden (la ve el pagador en Flow y en la cartola); va en optional.
    commerceOrder: `LP-${plan}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    subject: `LibrePedal Premium ${p.nombre}`,
    currency: "CLP",
    amount: String(p.monto),
    email,
    urlConfirmation: `${env.PUBLIC_URL}/flow/confirmar`,
    urlReturn: `${env.PUBLIC_URL}/flow/volver`,
    optional: JSON.stringify(opcional),
  };
  if (env.FLOW_PAYMENT_METHOD) params.paymentMethod = String(env.FLOW_PAYMENT_METHOD);
  const pago = await flow(env, "POST", "/payment/create", params);
  return json({ url: `${pago.url}?token=${pago.token}` }, 200, cors);
}

async function estadoPago(env, token) {
  return flow(env, "GET", "/payment/getStatus", { token });
}

// Flow llama aquí (servidor a servidor) cada vez que cambia el estado de un pago.
// No se confía en lo que llega: se consulta el estado real a Flow con el token.
async function confirmar(request, env) {
  if (!configOk(env)) throw new Error("pagos_no_configurados"); // 500 -> Flow reintenta cuando esté configurado
  const form = await request.formData();
  const token = form.get("token");
  if (!token) return new Response("sin token", { status: 400 });

  const st = await estadoPago(env, token);
  const { uid, plan, amigoUid } = leerOptional(st.optional);
  const p = Object.prototype.hasOwnProperty.call(planes(env), plan) ? planes(env)[plan] : null;
  const pagado = Number(st.status) === FLOW_PAGADA;
  // El monto se compara contra el precio del plan en el worker, no contra lo que dijo la app.
  const montoOk = !!p && Number(st.amount) === p.monto && st.currency === "CLP";
  const cuentas = plan === "duo" ? [uid, amigoUid] : [uid];
  const cuentasOk = !!p && cuentas.length === p.cuentas && cuentas.every((c) => typeof c === "string" && UID_OK.test(c))
    && new Set(cuentas).size === cuentas.length;

  if (pagado && montoOk && cuentasOk) {
    await acreditarPago(env, st, cuentas, plan, p.dias);
  } else {
    console.log("pago no acreditado", { flowOrder: st.flowOrder, status: st.status, montoOk, cuentasOk, plan });
    // Plata cobrada que no se pudo acreditar: queda anotada en pagos/ para revisarla y
    // devolverla a mano desde Flow (no solo en un log que se pierde).
    if (pagado) await registrarParaRevisar(env, st, { montoOk, cuentasOk, plan: String(plan) });
  }
  // Flow espera 200 para no reintentar.
  return new Response("ok");
}

async function volver(request, env) {
  let token = new URL(request.url).searchParams.get("token");
  if (!token && request.method === "POST") token = (await request.formData()).get("token");
  let resultado = "pendiente";
  if (token && configOk(env)) {
    const st = await estadoPago(env, token);
    const s = Number(st.status);
    resultado = s === FLOW_PAGADA ? "pagado" : s === 3 || s === 4 ? "rechazado" : "pendiente";
  }
  const destino = new URL(env.APP_RETURN_URL || "https://librepedal.cl/");
  destino.searchParams.set("pago", resultado);
  return Response.redirect(destino.toString(), 303);
}

// ---------- Firestore (REST con la service account) ----------

function raizDocs(env) {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}
function docName(env, ruta) {
  return `${raizDocs(env)}/${ruta}`;
}
function docUrl(env, ruta) {
  return `https://firestore.googleapis.com/v1/${docName(env, ruta)}`;
}

// El uid del amigo sale de su correo con la misma regla de worker-auth. Primero en
// minúsculas (worker-auth pasa a minúsculas el correo del ingreso por código; Firebase
// Auth entrega los correos en minúsculas), después tal cual lo escribió (cuentas viejas).
// Solo cuenta si users/{uid} existe: ese documento solo lo puede crear su dueño
// (firestore.rules: create exige request.auth.uid == id).
async function uidPorEmail(env, token, email) {
  const candidatos = [...new Set([cuDeEmail(email.toLowerCase()), cuDeEmail(email)])];
  for (const uid of candidatos) {
    if (UID_OK.test(uid) && (await firestoreGet(docUrl(env, `users/${uid}`), token))) return uid;
  }
  return null;
}

// Acredita un pago confirmado. Idempotente y a prueba de confirmaciones simultáneas:
//  1. Se registra pagos/{flowOrder} (solo si no existe) con la lista de cuentas.
//  2. Por cada cuenta aún no acreditada, UN commit atómico escribe su premium y la agrega
//     a pagos/{flowOrder}.aplicadoA, con precondición sobre la versión de ambos documentos.
//     Si otra confirmación se adelantó, el commit falla entero y se vuelve a leer: la
//     cuenta ya aparece en aplicadoA y no se le suman días otra vez.
// Si algo falla a medias, se lanza error -> 500 -> Flow reintenta y se retoma donde quedó.
async function acreditarPago(env, st, cuentas, plan, dias) {
  const token = await googleToken(env);
  const rutaPago = `pagos/${Number(st.flowOrder)}`;
  if (!Number.isFinite(Number(st.flowOrder))) throw new Error("flowOrder inválido");
  const ahora = Date.now();

  await firestoreCommit(env, token, [{
    update: {
      name: docName(env, rutaPago),
      fields: {
        estado: { stringValue: "procesando" },
        uid: { stringValue: cuentas[0] },
        cuentas: { arrayValue: { values: cuentas.map((u) => ({ stringValue: u })) } },
        aplicadoA: { arrayValue: { values: [] } },
        producto: { stringValue: `premium-${plan}` },
        monto: { integerValue: String(Math.round(Number(st.amount))) },
        moneda: { stringValue: String(st.currency) },
        email: { stringValue: st.payer || "" },
        commerceOrder: { stringValue: String(st.commerceOrder || "") },
        fecha: { timestampValue: new Date(ahora).toISOString() },
      },
    },
    currentDocument: { exists: false },
  }], { yaExisteEsOk: true });

  for (const uid of cuentas) {
    let listo = false;
    for (let intento = 0; intento < 6 && !listo; intento++) {
      const pago = await firestoreGet(docUrl(env, rutaPago), token);
      if (!pago) throw new Error(`no quedó registrado ${rutaPago}`);
      const aplicados = (pago.fields?.aplicadoA?.arrayValue?.values || []).map((v) => v.stringValue);
      if (aplicados.includes(uid)) { listo = true; break; }

      const user = await firestoreGet(docUrl(env, `users/${uid}`), token);
      if (!user) throw new Error(`no existe users/${uid}`); // 500 -> queda a la vista en los logs y Flow reintenta
      const prem = user.fields?.premium?.mapValue?.fields || {};
      const activo = prem.activo?.booleanValue === true;
      const expiraActual = activo ? Number(prem.expira?.integerValue ?? prem.expira?.doubleValue ?? 0) : 0;
      // Si la cuenta aún tiene premium vigente, los días se suman desde su vencimiento, no desde hoy.
      const expira = Math.max(Date.now(), expiraActual) + dias * 24 * 60 * 60 * 1000;

      const ok = await firestoreCommit(env, token, [
        {
          // Mismo formato que lee voz-motor.js: us.premium.activo && us.premium.expira > Date.now().
          // updateMask = solo "premium": no toca el resto del perfil.
          update: {
            name: user.name,
            fields: {
              premium: { mapValue: { fields: {
                activo: { booleanValue: true },
                expira: { integerValue: String(expira) },
                plan: { stringValue: plan },
                fuente: { stringValue: "flow" },
              } } },
            },
          },
          updateMask: { fieldPaths: ["premium"] },
          currentDocument: { updateTime: user.updateTime },
        },
        {
          transform: {
            document: pago.name,
            fieldTransforms: [{ fieldPath: "aplicadoA", appendMissingElements: { values: [{ stringValue: uid }] } }],
          },
          currentDocument: { updateTime: pago.updateTime },
        },
      ], { conflictoEsReintento: true });
      if (ok) listo = true;
    }
    if (!listo) throw new Error(`no se pudo acreditar ${uid} en ${rutaPago} tras varios intentos`);
  }
  await firestoreCommit(env, token, [{
    update: { name: docName(env, rutaPago), fields: { estado: { stringValue: "acreditado" } } },
    updateMask: { fieldPaths: ["estado"] },
  }]);
}

async function registrarParaRevisar(env, st, motivo) {
  if (!Number.isFinite(Number(st.flowOrder))) return;
  const token = await googleToken(env);
  await firestoreCommit(env, token, [{
    update: {
      name: docName(env, `pagos/${Number(st.flowOrder)}`),
      fields: {
        estado: { stringValue: "revisar" },
        motivo: { stringValue: JSON.stringify(motivo) },
        monto: { integerValue: String(Math.round(Number(st.amount) || 0)) },
        moneda: { stringValue: String(st.currency || "") },
        email: { stringValue: st.payer || "" },
        commerceOrder: { stringValue: String(st.commerceOrder || "") },
        fecha: { timestampValue: new Date().toISOString() },
      },
    },
    currentDocument: { exists: false },
  }], { yaExisteEsOk: true });
}

async function firestoreGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  return res.json();
}

// Devuelve true si se aplicó; false si falló una precondición y el llamador pidió
// reintentar (conflictoEsReintento) o tolerar que ya existiera (yaExisteEsOk).
async function firestoreCommit(env, token, writes, { yaExisteEsOk = false, conflictoEsReintento = false } = {}) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${raizDocs(env)}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  if (res.ok) return true;
  const texto = await res.text();
  const precondicion = res.status === 409 || /FAILED_PRECONDITION|ALREADY_EXISTS|ABORTED/.test(texto);
  if (precondicion && (yaExisteEsOk || conflictoEsReintento)) return false;
  throw new Error(`Firestore commit ${res.status}: ${texto}`);
}

async function googleToken(env) {
  const sa = JSON.parse(env.GCP_SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj) => base64url(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(new Uint8Array(sig))}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token: " + JSON.stringify(data));
  return data.access_token;
}

function base64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
