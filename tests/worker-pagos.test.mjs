// worker-pagos (2026-10-05): cobro del Premium con Flow. Es PLATA de clientes, así que
// se prueba el worker REAL (worker-pagos/worker.js, importado tal cual) contra una Flow
// y una Firestore simuladas en memoria -- nunca contra las reales, ni con llaves reales.
// La Flow simulada verifica la firma de cada llamada igual que la real
// (es-openApiFlow.yaml: parámetros ordenados, nombre+valor, HMAC-SHA256 con la secretKey)
// y la Firestore simulada aplica los commits de forma atómica con sus precondiciones
// (exists / updateTime), que es de lo que depende no acreditar dos veces.
// Casos que importan (cada uno es un error que costaría plata o reclamos):
//  - Flow devuelve `optional` como OBJETO (así lo muestra su especificación): el premium
//    se tiene que activar igual. Con la versión del correo NO se activaba.
//  - La misma confirmación dos veces, o dos al mismo tiempo: 30 días, no 60.
//  - Pago pendiente/rechazado o con monto distinto al plan: no se acredita nada.
//  - Plan dúo: el amigo se busca por su correo con la regla de worker-auth, no por un
//    campo que cualquiera puede escribir.
import { generateKeyPairSync, createHmac, createVerify } from 'node:crypto';
import worker from '../worker-pagos/worker.js';

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

const DIA = 24 * 60 * 60 * 1000;
const PROYECTO = 'librepedal-cb983';
const RAIZ = `projects/${PROYECTO}/databases/(default)/documents`;
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const env = {
  FLOW_ENV: 'sandbox',
  FLOW_API_KEY: 'API-KEY-PRUEBA',
  FLOW_SECRET_KEY: 'secreto-de-prueba',
  GCP_SA_JSON: JSON.stringify({ client_email: 'sa@prueba.iam.gserviceaccount.com', private_key: privateKey }),
  FIREBASE_PROJECT_ID: PROYECTO,
  PUBLIC_URL: 'https://pagos.prueba',
  APP_RETURN_URL: 'https://librepedal.cl/',
};

// ---------- Firestore simulada ----------
let docs, reloj, fallarProximoCommit, commits;
function reiniciar() { docs = new Map(); reloj = 0; fallarProximoCommit = false; commits = 0; flowOrdenes = new Map(); }
const nuevaVersion = () => `2026-10-05T00:00:00.${String(++reloj).padStart(6, '0')}Z`;
function crearUsuario(uid, campos = {}) {
  docs.set(`${RAIZ}/users/${uid}`, { fields: { nombre: { stringValue: uid }, ...campos }, updateTime: nuevaVersion() });
}
function premiumDe(uid) {
  const d = docs.get(`${RAIZ}/users/${uid}`);
  const p = d && d.fields.premium && d.fields.premium.mapValue.fields;
  return p ? { activo: p.activo.booleanValue, expira: Number(p.expira.integerValue), plan: p.plan.stringValue, fuente: p.fuente.stringValue } : null;
}
function pagoDoc(flowOrder) { return docs.get(`${RAIZ}/pagos/${flowOrder}`); }

function aplicarCommit(writes) {
  // Primero se validan TODAS las precondiciones; si una falla, no se escribe nada (atómico).
  for (const w of writes) {
    const name = w.update ? w.update.name : w.transform.document;
    const d = docs.get(name), pre = w.currentDocument;
    if (!pre) continue;
    if ('exists' in pre && pre.exists === false && d) return { status: 409, body: { error: { status: 'ALREADY_EXISTS' } } };
    if ('exists' in pre && pre.exists === true && !d) return { status: 404, body: { error: { status: 'NOT_FOUND' } } };
    if (pre.updateTime && (!d || d.updateTime !== pre.updateTime)) return { status: 400, body: { error: { status: 'FAILED_PRECONDITION' } } };
  }
  for (const w of writes) {
    if (w.update) {
      const d = docs.get(w.update.name);
      let fields;
      if (w.updateMask) {
        fields = { ...(d ? d.fields : {}) };
        for (const f of w.updateMask.fieldPaths) fields[f] = w.update.fields[f];
      } else fields = { ...w.update.fields };
      docs.set(w.update.name, { fields, updateTime: nuevaVersion() });
    } else {
      const d = docs.get(w.transform.document);
      const fields = { ...d.fields };
      for (const ft of w.transform.fieldTransforms) {
        const actuales = (fields[ft.fieldPath] && fields[ft.fieldPath].arrayValue.values) || [];
        const nuevos = ft.appendMissingElements.values.filter((v) => !actuales.some((a) => a.stringValue === v.stringValue));
        fields[ft.fieldPath] = { arrayValue: { values: [...actuales, ...nuevos] } };
      }
      docs.set(w.transform.document, { fields, updateTime: nuevaVersion() });
    }
  }
  return { status: 200, body: {} };
}

// ---------- Flow simulada ----------
let flowOrdenes; // token -> { params, flowOrder, status, optionalComoObjeto, montoCobrado }
let siguienteFlowOrder = 9000;
function firmaFlow(params) {
  const base = Object.keys(params).filter((k) => k !== 's').sort().map((k) => k + params[k]).join('');
  return createHmac('sha256', env.FLOW_SECRET_KEY).update(base).digest('hex');
}
let firmasMalas = 0;

// ---------- fetch simulado ----------
const respuesta = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  await new Promise((r) => setTimeout(r, 0)); // deja intercalar llamadas concurrentes, como en la red real
  url = String(url);
  if (url === 'https://oauth2.googleapis.com/token') {
    const assertion = new URLSearchParams(String(init.body)).get('assertion');
    const [h, p, s] = assertion.split('.');
    const valida = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url'));
    return valida ? respuesta(200, { access_token: 'token-google' }) : respuesta(400, { error: 'firma JWT inválida' });
  }
  if (url.startsWith('https://sandbox.flow.cl/api/')) {
    const u = new URL(url);
    const params = Object.fromEntries(init.method === 'POST' ? new URLSearchParams(String(init.body)) : u.searchParams);
    if (params.apiKey !== env.FLOW_API_KEY || params.s !== firmaFlow(params)) { firmasMalas++; return respuesta(401, { code: 108, message: 'firma inválida' }); }
    if (u.pathname === '/api/payment/create') {
      const token = 'tok' + (++siguienteFlowOrder);
      flowOrdenes.set(token, { params, flowOrder: siguienteFlowOrder, status: 1, optionalComoObjeto: true, montoCobrado: Number(params.amount) });
      return respuesta(200, { url: 'https://sandbox.flow.cl/app/web/pay.php', token, flowOrder: siguienteFlowOrder });
    }
    if (u.pathname === '/api/payment/getStatus') {
      const o = flowOrdenes.get(params.token);
      if (!o) return respuesta(400, { code: 105, message: 'token inválido' });
      const optional = o.optionalComoObjeto ? JSON.parse(o.params.optional) : o.params.optional;
      return respuesta(200, { flowOrder: o.flowOrder, commerceOrder: o.params.commerceOrder, status: o.status, subject: o.params.subject,
        currency: o.params.currency, amount: o.montoCobrado, payer: o.params.email, optional });
    }
  }
  if (url.startsWith('https://firestore.googleapis.com/v1/')) {
    if ((init.headers || {}).Authorization !== 'Bearer token-google') return respuesta(401, { error: 'sin auth' });
    const ruta = url.slice('https://firestore.googleapis.com/v1/'.length);
    if (ruta === `${RAIZ}:commit`) {
      commits++;
      if (fallarProximoCommit) { fallarProximoCommit = false; return respuesta(503, { error: { status: 'UNAVAILABLE' } }); }
      const r = aplicarCommit(JSON.parse(init.body).writes);
      return respuesta(r.status, r.body);
    }
    const d = docs.get(ruta);
    return d ? respuesta(200, { name: ruta, fields: d.fields, updateTime: d.updateTime }) : respuesta(404, { error: { status: 'NOT_FOUND' } });
  }
  throw new Error('fetch inesperado en el test: ' + url);
};

// ---------- ayudantes ----------
async function crear(body) {
  const res = await worker.fetch(new Request('https://pagos.prueba/pago/crear', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://librepedal.cl' }, body: JSON.stringify(body),
  }), env);
  return { status: res.status, data: await res.json() };
}
const tokenDe = (url) => new URL(url).searchParams.get('token');
async function confirmarFlow(token) {
  const res = await worker.fetch(new Request('https://pagos.prueba/flow/confirmar', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }),
  }), env);
  return res.status;
}
const casiIgual = (a, b) => Math.abs(a - b) < 60 * 1000;

// ---------- casos ----------
console.log('worker-pagos: cobro del Premium con Flow (simulado)');

{ // 1. Crear un pago individual: monto del plan, firma válida, uid en optional (no en la orden)
  reiniciar(); crearUsuario('ana_gmail_com');
  const r = await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'individual' });
  t('crear individual responde 200', r.status === 200);
  t('devuelve la url de pago de Flow con token', /^https:\/\/sandbox\.flow\.cl\/app\/web\/pay\.php\?token=tok\d+$/.test(r.data.url || ''));
  const o = flowOrdenes.get(tokenDe(r.data.url));
  t('monto enviado a Flow = 3000 CLP', o && o.params.amount === '3000' && o.params.currency === 'CLP');
  t('optional lleva uid y plan', o && JSON.parse(o.params.optional).uid === 'ana_gmail_com' && JSON.parse(o.params.optional).plan === 'individual');
  t('el uid no queda en la orden visible', o && !o.params.commerceOrder.includes('ana_gmail_com'));
  t('urls de confirmación y retorno apuntan al worker', o && o.params.urlConfirmation === 'https://pagos.prueba/flow/confirmar' && o.params.urlReturn === 'https://pagos.prueba/flow/volver');
  t('sin FLOW_PAYMENT_METHOD no se fuerza medio de pago', o && !('paymentMethod' in o.params));
  t('todas las firmas a Flow fueron válidas', firmasMalas === 0);
}

{ // 2. Validaciones antes de cobrar (nadie paga por algo que no se puede acreditar)
  reiniciar(); crearUsuario('ana_gmail_com'); crearUsuario('beto_gmail_com');
  t('uid con caracteres de ruta -> 400', (await crear({ uid: '../users/x', email: 'a@b.cl' })).status === 400);
  t('email inválido -> 400', (await crear({ uid: 'ana_gmail_com', email: 'no-es-correo' })).status === 400);
  t('plan inventado -> 400 plan_invalido', (await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'gratis' })).data.error === 'plan_invalido');
  t('plan "toString" no cuela por el prototipo', (await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'toString' })).data.error === 'plan_invalido');
  t('cuenta inexistente -> 404 cuenta_inexistente', (await crear({ uid: 'nadie_gmail_com', email: 'nadie@gmail.com' })).data.error === 'cuenta_inexistente');
  t('dúo sin correo del amigo -> falta_email_amigo', (await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'duo' })).data.error === 'falta_email_amigo');
  t('dúo con amigo sin cuenta -> amigo_sin_cuenta', (await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'duo', emailAmigo: 'zeta@gmail.com' })).data.error === 'amigo_sin_cuenta');
  t('dúo consigo misma -> amigo_es_el_mismo', (await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'duo', emailAmigo: 'Ana@Gmail.com' })).data.error === 'amigo_es_el_mismo');
  t('ninguna validación fallida creó una orden en Flow', flowOrdenes.size === 0);
}

{ // 3. EL ERROR GRAVE: Flow devuelve optional como OBJETO -> igual se activa
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2; flowOrdenes.get(tok).optionalComoObjeto = true;
  t('confirmar responde 200', (await confirmarFlow(tok)) === 200);
  const p = premiumDe('ana_gmail_com');
  t('optional objeto: premium activo', p && p.activo === true && p.plan === 'individual' && p.fuente === 'flow');
  t('optional objeto: vence en 30 días', p && casiIgual(p.expira, Date.now() + 30 * DIA));
  const pago = pagoDoc(flowOrdenes.get(tok).flowOrder);
  t('pago registrado como acreditado', pago && pago.fields.estado.stringValue === 'acreditado' && pago.fields.monto.integerValue === '3000');
  t('el resto del perfil no se tocó', docs.get(`${RAIZ}/users/ana_gmail_com`).fields.nombre.stringValue === 'ana_gmail_com');
}

{ // 4. optional como texto JSON -> también se activa
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2; flowOrdenes.get(tok).optionalComoObjeto = false;
  await confirmarFlow(tok);
  t('optional texto: premium activo', premiumDe('ana_gmail_com')?.activo === true);
}

{ // 5. Pendiente / rechazado / anulado: nada
  for (const [status, nombre] of [[1, 'pendiente'], [3, 'rechazado'], [4, 'anulado']]) {
    reiniciar(); crearUsuario('ana_gmail_com');
    const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
    flowOrdenes.get(tok).status = status;
    t(`${nombre}: confirmar responde 200 (Flow no reintenta)`, (await confirmarFlow(tok)) === 200);
    t(`${nombre}: sin premium`, premiumDe('ana_gmail_com') === null);
    t(`${nombre}: sin registro de pago`, !pagoDoc(flowOrdenes.get(tok).flowOrder));
  }
}

{ // 6. Pagado pero con monto distinto al plan: no se acredita y queda para revisar
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  const o = flowOrdenes.get(tok); o.status = 2; o.montoCobrado = 100;
  await confirmarFlow(tok);
  t('monto distinto: sin premium', premiumDe('ana_gmail_com') === null);
  t('monto distinto: queda en pagos/ con estado revisar', pagoDoc(o.flowOrder)?.fields.estado.stringValue === 'revisar');
}

{ // 7. La misma confirmación dos veces (Flow reintenta): 30 días, no 60
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2;
  await confirmarFlow(tok); await confirmarFlow(tok);
  t('doble confirmación seguida: 30 días', casiIgual(premiumDe('ana_gmail_com').expira, Date.now() + 30 * DIA));
}

{ // 8. Dos confirmaciones AL MISMO TIEMPO: 30 días, no 60
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2;
  const estados = await Promise.all([confirmarFlow(tok), confirmarFlow(tok), confirmarFlow(tok)]);
  t('simultáneas: todas responden 200', estados.every((s) => s === 200));
  t('simultáneas: 30 días, no 60 ni 90', casiIgual(premiumDe('ana_gmail_com').expira, Date.now() + 30 * DIA));
  const aplicados = pagoDoc(flowOrdenes.get(tok).flowOrder).fields.aplicadoA.arrayValue.values;
  t('simultáneas: la cuenta figura una sola vez en aplicadoA', aplicados.length === 1);
}

{ // 9. Premium vigente: los días se suman desde el vencimiento, no desde hoy
  reiniciar();
  const vence = Date.now() + 10 * DIA;
  crearUsuario('ana_gmail_com', { premium: { mapValue: { fields: { activo: { booleanValue: true }, expira: { integerValue: String(vence) }, plan: { stringValue: 'individual' }, fuente: { stringValue: 'flow' } } } } });
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2;
  await confirmarFlow(tok);
  t('renovación anticipada: vence en 40 días', casiIgual(premiumDe('ana_gmail_com').expira, vence + 30 * DIA));
}

{ // 10. Plan dúo: las dos cuentas, $4.000, amigo encontrado por la regla de worker-auth
  reiniciar(); crearUsuario('ana_gmail_com'); crearUsuario('beto_gmail_com');
  const r = await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'duo', emailAmigo: '  Beto@Gmail.com ' });
  t('dúo: crear 200', r.status === 200);
  const o = flowOrdenes.get(tokenDe(r.data.url));
  t('dúo: monto 4000', o.params.amount === '4000');
  t('dúo: amigo resuelto a beto_gmail_com', JSON.parse(o.params.optional).amigoUid === 'beto_gmail_com');
  o.status = 2;
  await Promise.all([confirmarFlow(tokenDe(r.data.url)), confirmarFlow(tokenDe(r.data.url))]);
  t('dúo: ana con 30 días', casiIgual(premiumDe('ana_gmail_com').expira, Date.now() + 30 * DIA) && premiumDe('ana_gmail_com').plan === 'duo');
  t('dúo: beto con 30 días', casiIgual(premiumDe('beto_gmail_com').expira, Date.now() + 30 * DIA));
}

{ // 11. Dúo: un usersPrivate.email falso ya NO sirve para robar el regalo
  reiniciar(); crearUsuario('ana_gmail_com'); crearUsuario('beto_gmail_com'); crearUsuario('mala_gmail_com');
  docs.set(`${RAIZ}/usersPrivate/mala_gmail_com`, { fields: { email: { stringValue: 'beto@gmail.com' } }, updateTime: nuevaVersion() });
  const r = await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com', plan: 'duo', emailAmigo: 'beto@gmail.com' });
  t('correo suplantado en usersPrivate: el regalo va a beto, no a mala', JSON.parse(flowOrdenes.get(tokenDe(r.data.url)).params.optional).amigoUid === 'beto_gmail_com');
}

{ // 12. Firestore falla a medias: 500 (Flow reintenta) y el reintento acredita una sola vez
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2;
  fallarProximoCommit = true;
  t('falla de Firestore -> 500 para que Flow reintente', (await confirmarFlow(tok)) === 500);
  t('reintento -> 200', (await confirmarFlow(tok)) === 200);
  t('tras falla y reintento: 30 días exactos', casiIgual(premiumDe('ana_gmail_com').expira, Date.now() + 30 * DIA));
}

{ // 13. Datos de optional adulterados (plan dúo sin amigo): no se acredita, queda para revisar
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  const o = flowOrdenes.get(tok); o.status = 2; o.montoCobrado = 4000;
  o.params.optional = JSON.stringify({ uid: 'ana_gmail_com', plan: 'duo' });
  await confirmarFlow(tok);
  t('dúo sin amigo en optional: sin premium', premiumDe('ana_gmail_com') === null);
  t('dúo sin amigo en optional: queda para revisar', pagoDoc(o.flowOrder)?.fields.estado.stringValue === 'revisar');
}

{ // 14. Vuelta del navegador: redirige a la app con el resultado
  reiniciar(); crearUsuario('ana_gmail_com');
  const tok = tokenDe((await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' })).data.url);
  flowOrdenes.get(tok).status = 2;
  const res = await worker.fetch(new Request('https://pagos.prueba/flow/volver', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: tok }),
  }), env);
  t('volver: 303 a la app con ?pago=pagado', res.status === 303 && res.headers.get('Location') === 'https://librepedal.cl/?pago=pagado');
  t('volver NO acredita nada (eso solo lo hace confirmar)', premiumDe('ana_gmail_com') === null);
}

{ // 15. Solo tarjetas: con FLOW_PAYMENT_METHOD se manda paymentMethod firmado
  reiniciar(); crearUsuario('ana_gmail_com');
  env.FLOW_PAYMENT_METHOD = '1';
  const r = await crear({ uid: 'ana_gmail_com', email: 'ana@gmail.com' });
  delete env.FLOW_PAYMENT_METHOD;
  t('paymentMethod enviado a Flow', flowOrdenes.get(tokenDe(r.data.url)).params.paymentMethod === '1');
  t('firma válida con paymentMethod', firmasMalas === 0);
}

{ // 16. Sin secretos configurados: no se cobra nada
  const r = await worker.fetch(new Request('https://pagos.prueba/pago/crear', { method: 'POST', body: '{}' }), { FLOW_ENV: 'sandbox' });
  t('sin configuración -> 503 pagos_no_configurados', r.status === 503);
}

console.log(`  ${ok} OK, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
