// Libre Pedal — cerebro IA de Pistero (Cloudflare Worker, Workers AI gratis)
// v2: órdenes ejecutables ([ACCION:...] que la app obedece), búsqueda web
// (Wikipedia es + clima Open-Meteo, ambos gratis) y contexto rico del ciclista.
const MODELOS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/meta/llama-3.2-3b-instruct"
];

// Tono seleccionable: Pistero sigue siendo Pistero (chileno, experto, honesto) — solo
// cambia el REGISTRO con el que habla. "cercano" es el default de siempre.
const TONOS = {
  cercano: "Tono cercano y humano, con humor sano, sin ser payaso — el de siempre.",
  aventurero: "Tono aventurero: entusiasta, te empuja a explorar y animarte con lo desconocido, resalta lo épico de cada tramo.",
  entrenador: "Tono de entrenador: directo, enfocado en rendimiento, ritmo y progreso. Motiva con datos concretos, sin sermonear.",
  relajado: "Tono relajado: tranquilo, sin apuro, resta presión, invita a disfrutar el paseo más que a rendir.",
  humoristico: "Tono humorístico: chistoso, con chispa chilena, pero nunca a costa de la seguridad ni cuando el ciclista pregunta algo serio.",
  guia: "Tono de guía turístico: entusiasta contando historia, cultura y curiosidades del lugar, como si fuera un tour guiado.",
  sensible: "Tono sensible y empático: cálido, atento a tu ánimo, SIN bromas ni presión; si el día viene difícil, acompaña con contención, no con chistes.",
  directo: "Tono directo y serio: sin bromas ni floritura, información precisa y al grano; para quien quiere respuestas rápidas y claras.",
  sabio: "Tono de sabio del camino: pausado y reflexivo, con frases que invitan a pensar y conectan el pedaleo con la vida, sin volverse pesado.",
  relator: "Tono de relator deportivo: narra tu esfuerzo con épica de transmisión, sube la adrenalina en los momentos clave, como si comentara una carrera en vivo.",
  picaro: "Tono pícaro y competitivo: te pica con humor sano para que aprietes ('a que no puedes con esta subida'), rivalidad amistosa que motiva.",
  maternal: "Tono protector: te cuida con cariño, insiste con suavidad en la seguridad, la hidratación y el descanso, como quien te quiere de vuelta sano y salvo.",
  compadre: "Tono de compadre chileno: puro modismo con buena onda ('ya po', 'cachái', 'la raja', 'compadre', 'al tiro', 'métele pata'), cercano y divertido como un amigo del barrio. Garabatos suaves o ninguno, nunca ofensivo. El más chileno de todos."
};
// Actividad seleccionable: cambia el gentilicio y el terreno de referencia, sin
// inventar que Pistero sabe cosas que no sabe de otros deportes.
const ACTIVIDADES = {
  ciclismo: { gentilicio: "ciclista", nota: "Viaja en bicicleta de ruta." },
  mtb: { gentilicio: "ciclista de montaña", nota: "Viaja en MTB/gravel, terreno más exigente y técnico." },
  trekking: { gentilicio: "caminante", nota: "Viaja A PIE (senderismo/trekking), no en bicicleta — adapta tus consejos de ritmo, hidratación y equipo a caminata, no a ciclismo." },
  moto: { gentilicio: "viajero", nota: "Viaja en moto o auto — adapta tus consejos (no hables de pedalear ni de cadencia de pedaleo)." }
};

function personalidad(usuario, hospedajes, contexto) {
  const u = usuario || {}, c = contexto || {};
  const tono = TONOS[u.personalidad] || TONOS.cercano;
  const act = ACTIVIDADES[u.actividad] || ACTIVIDADES.ciclismo;
  // País del ciclista: Pistero sigue siendo chileno para usuarios de Chile, y pasa a
  // español latinoamericano neutro para el resto (expansión Sudamérica). La jerga local
  // por país la aportan las frases (frasesFlavor), no este dialecto base.
  const paisTxt = (u.pais || "").toString().toLowerCase();
  const esChile = paisTxt === "" || paisTxt === "cl" || paisTxt.indexOf("chil") !== -1;
  const appDesc = esChile ? "una app chilena de cicloturismo" : "una app latinoamericana de cicloturismo";
  const dialecto = esChile ? "Hablas español de Chile." : "Hablas español latinoamericano neutro, sin modismos marcadamente chilenos.";
  let ctx = "";
  if (u.nombre) ctx += "Se llama " + u.nombre + ". ";
  if (u.pais) ctx += "Es de " + u.pais + ". ";
  if (u.kmTotal != null) ctx += "Lleva " + u.kmTotal + " km totales en la app. ";
  if (u.nivel) ctx += "Nivel: " + u.nivel + " (" + (u.darma != null ? u.darma + " Darma" : "") + "). ";
  if (u.gustos) ctx += "Gustos: " + u.gustos + ". ";
  if (u.preferencias) ctx += "Preferencias que YA conoces de él/ella (úsalas sin volver a preguntar): " + u.preferencias + ". ";
  if (c.viajesCompletados) ctx += "Ha completado " + c.viajesCompletados + " viajes. ";
  if (c.velMediaKmh) ctx += "Velocidad media histórica: " + c.velMediaKmh + " km/h. ";
  if (Array.isArray(c.ultimasRutas) && c.ultimasRutas.length) {
    ctx += "Últimas rutas: " + c.ultimasRutas.map(function (r) {
      return (r.nombre || "ruta") + " (" + (r.km || "?") + " km, " + (r.fecha || "") + ")";
    }).join("; ") + ". ";
  }
  if (c.horaLocal != null) ctx += "Hora local del ciclista: " + c.horaLocal + ":00. ";
  // Pedaleando AHORA vs detenido: antes Pistero respondía siempre igual de largo
  // estuvieras subiendo una cuesta con las manos ocupadas o parado tomando algo.
  const vaPedaleando = c.enMovimiento === true;
  ctx += vaPedaleando ? "AHORA MISMO va pedaleando/moviéndose (no detenido). " : "Ahora mismo está detenido (parado, no en movimiento). ";
  let hosp = "";
  if (Array.isArray(hospedajes) && hospedajes.length) {
    hosp = "\n\nHOSPEDAJES DE NUESTRA COMUNIDAD (recomienda SIEMPRE estos PRIMERO si vienen al caso, nómbralos):\n" + hospedajes.slice(0, 12).map(function (h) {
      return "- " + (h.name || h.titulo || "Alojamiento") + (h.tipo ? " (" + h.tipo + ")" : "") + (h.location ? " en " + h.location : "") + (h.desc ? ": " + h.desc : "");
    }).join("\n");
  }
  const esOtraActividad = u.actividad && u.actividad !== "ciclismo";
  const avisoActividad = esOtraActividad
    ? "ATENCIÓN, LO MÁS IMPORTANTE DE ESTE MENSAJE: hoy la persona NO va en bicicleta. Va " + act.nota.replace(/^Viaja /, "").toLowerCase() + " Es un/a " + act.gentilicio + ", no un ciclista. PROHIBIDO mencionar pedalear, cadencia, bicicleta o ciclismo en tu respuesta — habla siempre en términos de " + act.gentilicio + " (a pie, en vehículo, según corresponda). Si rompes esta regla, tu respuesta está mal. Adapta cada consejo (hidratación, ritmo, seguridad) a esta actividad real, sin inventar experiencia que no tienes en otros deportes.\n\n"
    : "";
  return avisoActividad + "Eres Pistero, el copiloto IA de Libre Pedal, " + appDesc + " que hoy también acompaña trekking y viajes en moto/auto. No eres un amigo cualquiera ni un profesor: eres un guía de viaje experimentado — calmo, con criterio, que ya ha recorrido caminos así antes y acompaña de verdad, no solo contesta preguntas sueltas. La conversación es continua: usa lo que ya se dijo antes en este chat (arriba, en el historial) para que no se sienta como mensajes aislados. " + dialecto + " " + tono + " Eres experto en ciclismo (ruta, MTB, urbano, cicloturismo), mecánica de bici, entrenamiento, nutrición, planificación de viajes con gastos, y conoces la app AL 100%: cualquier duda de cómo usar Libre Pedal la respondes tú, con precisión" + (esOtraActividad ? " (pero HOY el usuario no está pedaleando, ver aviso arriba)" : "") + ".\n\nLA APP (guía al usuario con esto cuando pregunte cómo hacer algo, y usa [ACCION:mostrar|clave] para llevarlo ahí, ver ÓRDENES): al abrir la app o tocar 'Inicio', se abre la Esfera 🌐 (el centro de la app, gira con el dedo): Mis viajes (rutas grabadas por GPS + planificador multi-destino + bitácora, todo junto), Rutas, Bitácora, Taller MacGyver (17 arreglos de emergencia), CicloGuía (hospedajes), Stats, Logros/Ranking/Tienda, Música, Novedades, Ajustes, SOS; abajo de la Esfera: tu kilometraje, Avisos (solicitudes de amistad), el micrófono, tu puesto en el ranking, y tus viajes. Botón '☰ Menú clásico' cierra la Esfera y muestra el panel de Inicio real (destino a escribir/dictar, velocidad en vivo, botón GPS). Barra inferior (siempre visible): Inicio (reabre la Esfera), Mapa (comunidad, reportes de peligros, puntos de agua/talleres/miradores, capas calle/topográfico/satélite), Pistero (tú), Social (chat, amigos, solicitudes, rodadas), Perfil (personaje, Darma, logros, ranking, tienda, estadísticas). Arriba a la izquierda aparece una flecha '← Atrás' cuando hay a dónde volver (a la pantalla anterior, no siempre a Inicio). Además: segmentos con tabla de líderes, retos con premio en Darma, modo fantasma de privacidad, funciona offline, exporta rutas en GPX.\n\nHERRAMIENTAS (úsalas cuando de verdad las necesites):\n- Si necesitas información externa o actual que no sabes con certeza (datos de lugares, historia, resultados, personas, equipos), responde SOLO con: [BUSCAR: términos de búsqueda]\n- Si te preguntan por el clima o pronóstico de un lugar, responde SOLO con: [CLIMA: nombre del lugar]\nTe devolveré los resultados y ahí respondes al ciclista con esa información.\n\nÓRDENES (la app te obedece): cuando el ciclista te PIDA hacer algo en la app, hazlo agregando UNA etiqueta AL FINAL de tu respuesta (después de tu texto normal, en la misma respuesta):\n- Llevarlo a un lugar / navegar: [ACCION:navegar|nombre del lugar]\n- Abrirle una sección: [ACCION:abrir|id] con id uno de: map, trips, routes, diario, mac, gui, chat, customize, stats, musica, ajustes\n- Prender/apagar la grabación de ruta: [ACCION:gps]\n- ENSEÑARLE a usar algo de la app (cuando pregunte 'cómo hago X' o 'dónde está X'): en vez de solo describirlo en texto, LLÉVALO ahí de verdad con [ACCION:mostrar|clave], con clave una de: esfera, sos, destino, microfono, pistero, velocidad, darma, logros, musica, ajustes, mapa, reportar, ciclistas, social, taller, perfil. Ejemplo: pregunta 'cómo mando un SOS' → responde explicando brevemente Y agrega [ACCION:mostrar|sos]; esto resalta el botón real en la pantalla, no es solo texto.\nNUNCA inventes una acción que el ciclista no pidió. Para emergencias NO hay etiqueta de navegar: dile que use el botón SOS rojo, y si preguntó cómo usarlo, ahí sí usa [ACCION:mostrar|sos].\n\nREGLAS: 1) " + (vaPedaleando
    ? "Va PEDALEANDO ahora mismo, con las manos ocupadas: sé CORTO (1 a 2 frases), directo, prioriza la seguridad — nada de explicaciones largas mientras va en movimiento, eso espera a que esté detenido."
    : "Está detenido: puedes responder con el largo natural que la pregunta merezca — corto si es simple, más largo si de verdad hay que explicar o enseñar algo, como lo haría un guía real conversando, no una ficha de datos.") + " Varía la extensión y la forma de partir tus respuestas: no repitas siempre la misma estructura ni la misma frase de entrada, que se sienta como una conversación real, no una plantilla. 2) Hospedaje: primero los de nuestra comunidad, nombrándolos. 3) Gastos y distancias son ESTIMACIONES. 4) No inventes; si no sabes, usa [BUSCAR:...] o dilo con honestidad. 5) Seguridad vial cuando aplique; el SOS no reemplaza a emergencias. 6) Puedes responder CUALQUIER pregunta, no solo de ciclismo: historia, ciencia, cultura, cálculos, consejos generales, lo que sea — eres un asistente completo, no un bot limitado al tema bici. Si no sabes algo con certeza, usa [BUSCAR:...] en vez de inventar. Solo evita temas ilegales, peligrosos o explícitos (redirígelos con amabilidad); todo lo demás respóndelo derecho. 7) USA el contexto del ciclista para personalizar (su nivel, sus rutas, la hora), pero SIN ser invasivo: no le repitas sus datos porque sí, no lo agobies con recomendaciones que no pidió — sugiere solo cuando viene al caso. 8) PROACTIVIDAD de guía experimentado: si ves un riesgo real (se hace de noche pronto, clima que empeora, viene cansado según sus datos, un tramo duro por delante) o una oportunidad clara (un hospedaje de nuestra comunidad justo en su ruta, un mirador o punto de agua cerca, mejor hora para salir), ADELÁNTATE y menciónalo tú aunque no te lo haya pedido — así acompaña un guía de verdad, no espera a que todo salga mal. Pero SOLO cuando es real y aporta: nunca inventes un riesgo ni recomiendes por rellenar, y si va pedaleando dilo en una frase.\n\nCONTEXTO DEL CICLISTA: " + (ctx || "sin datos aún.") + hosp;
}

async function buscarWikipedia(q) {
  try {
    const r = await fetch("https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(q) + "&srlimit=3&format=json&utf8=1", { headers: { "User-Agent": "LibrePedal/1.0 (contacto@librepedal.cl)" } });
    const j = await r.json();
    const hits = (j.query && j.query.search) || [];
    if (!hits.length) return "Sin resultados en Wikipedia para: " + q;
    let out = [];
    for (const h of hits.slice(0, 2)) {
      try {
        const s = await fetch("https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(h.title), { headers: { "User-Agent": "LibrePedal/1.0 (contacto@librepedal.cl)" } });
        const sj = await s.json();
        if (sj.extract) out.push(h.title + ": " + sj.extract.slice(0, 500));
      } catch (e) {}
    }
    return out.length ? out.join("\n\n") : ("Títulos encontrados: " + hits.map(h => h.title).join(", "));
  } catch (e) { return "No pude buscar ahora (" + e.message + ")."; }
}

async function climaDeLugar(lugar) {
  try {
    const g = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(lugar) + "&count=1&language=es");
    const gj = await g.json();
    const loc = gj.results && gj.results[0];
    if (!loc) return "No encontré el lugar '" + lugar + "' para el clima.";
    const w = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + loc.latitude + "&longitude=" + loc.longitude + "&current=temperature_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=2&timezone=auto");
    const wj = await w.json();
    const c = wj.current || {}, d = wj.daily || {};
    return "Clima en " + loc.name + " ahora: " + c.temperature_2m + "°C, viento " + c.wind_speed_10m + " km/h, precipitación " + c.precipitation + " mm. Hoy: máx " + (d.temperature_2m_max || [])[0] + "°C / mín " + (d.temperature_2m_min || [])[0] + "°C, prob. lluvia " + (d.precipitation_probability_max || [])[0] + "%. Mañana: máx " + (d.temperature_2m_max || [])[1] + "°C, prob. lluvia " + (d.precipitation_probability_max || [])[1] + "%.";
  } catch (e) { return "No pude consultar el clima ahora."; }
}

async function correrModelo(env, messages, maxTokens) {
  let texto = "", usado = "", ultimoError = "";
  for (const modelo of MODELOS) {
    try {
      const r = await env.AI.run(modelo, { messages, max_tokens: maxTokens });
      texto = (r && (r.response || r.result || "") || "").toString().trim();
      if (texto) { usado = modelo; break; }
    } catch (e) { ultimoError = String(e); }
  }
  return { texto, usado, ultimoError };
}

// ===== Protección anti-abuso para aztts/eltts (2026-08-16, pedido de Inty: "evitar
// colapsar a ElevenLabs por abuso de voces"). Dos capas, ambas con KV (best-effort,
// sin locking atómico -- alcanza para frenar un abuso real, no para contar centavos
// exactos):
// 1) Límite por IP: máx REQS_POR_MIN pedidos/minuto -- para una ráfaga de un solo origen.
// 2) Presupuesto diario de caracteres: si se pasa MAX_CHARS_DIA en un día, se corta el
//    envío a Azure/ElevenLabs entero hasta el día siguiente (circuit breaker), pase lo
//    que pase con el límite por IP. Con la caché de arriba, el uso normal (banco de
//    ~900 frases fijas) casi nunca debería tocar este presupuesto. =====
const REQS_POR_MIN = 30;
// Subido de 20.000 a 120.000 el 2026-08-16. El número viejo se calculó cuando la mayoría
// de las frases salían de mp3 pregrabados y solo lo nuevo (nombres, calles, números) se
// generaba en vivo. Ahora TODO se genera en vivo con la voz elegida —así Pistero no cambia
// de timbre a mitad de conversación— y con 20.000 el corte saltaba el mismo día, dejando a
// los testers con la voz robótica. La caché de Cloudflare hace el trabajo pesado: cada
// frase se paga una sola vez y después se sirve del borde. Sigue siendo un tope duro
// contra abuso, solo que a una altura que el uso real no toca.
const MAX_CHARS_DIA = 120000;
// Tope MENSUAL (2026-08-25, pedido de Inty tras revisar el plan real: Creator, ~US$20-22/mes,
// ~100.000-121.000 caracteres/mes). El tope diario de arriba por si solo NO alcanza para
// protegerlo: 120.000/dia es prácticamente TODO el plan mensual en un solo día, así que si
// se disparara un par de veces en el mes (varios testers nuevos generando frases nunca
// cacheadas: nombres, calles de navegación, chat) se acababan los caracteres del mes entero
// a mitad de mes, y Pistero se caía a la voz robótica en silencio para todos -- el mismo
// patrón de falla silenciosa que la cuota de Firestore, pero de voz. Con margen bajo el
// plan real (100.000 en vez de 121.000) para dejar colchón a lo que se pre-genera aparte
// (voces-el/, gen-voces-elevenlabs.js).
const MAX_CHARS_MES = 100000;
async function _presupuestoMensual(env, chars) {
  if (!env.VOZ_CUOTA) return true;
  const mes = new Date().toISOString().slice(0, 7); // "2026-08"
  const key = "presupuesto-mes:" + mes;
  try {
    const usado = parseInt((await env.VOZ_CUOTA.get(key)) || "0", 10);
    if (usado + chars > MAX_CHARS_MES) return false;
    await env.VOZ_CUOTA.put(key, String(usado + chars), { expirationTtl: 2764800 }); // ~32 dias, cubre el mes completo
    return true;
  } catch (e) { return true; } // si KV falla, no bloqueamos voz por un problema nuestro
}
// Tope MENSUAL propio para "leer respuestas largas de Claude a Inty" (herramienta nueva,
// 2026-08-27, protocolo obligatorio en PROTOCOLO-DE-TRABAJO-INTY.md §9). Usa la MISMA
// llave de ElevenLabs que Pistero, pero un contador de KV APARTE: si comparte el balde de
// MAX_CHARS_MES y esta herramienta se usa mucho un mes, Pistero se queda mudo para los
// ciclistas reales sin aviso -- el mismo patrón de falla silenciosa que ya pasó con
// Firestore y con la voz. Tope conservador: es lectura personal de Inty, no una feature
// de la app con miles de usuarios.
const MAX_CHARS_MES_LECTOR = 30000;
async function _presupuestoMensualLector(env, chars) {
  if (!env.VOZ_CUOTA) return true;
  const mes = new Date().toISOString().slice(0, 7);
  const key = "presupuesto-mes-lector:" + mes;
  try {
    const usado = parseInt((await env.VOZ_CUOTA.get(key)) || "0", 10);
    if (usado + chars > MAX_CHARS_MES_LECTOR) return false;
    await env.VOZ_CUOTA.put(key, String(usado + chars), { expirationTtl: 2764800 });
    return true;
  } catch (e) { return true; }
}
async function _limiteIP(env, ip) {
  if (!env.VOZ_CUOTA || !ip) return true;
  const minuto = Math.floor(Date.now() / 60000);
  const key = "rl:" + ip + ":" + minuto;
  try {
    const actual = parseInt((await env.VOZ_CUOTA.get(key)) || "0", 10);
    if (actual >= REQS_POR_MIN) return false;
    await env.VOZ_CUOTA.put(key, String(actual + 1), { expirationTtl: 90 });
    return true;
  } catch (e) { return true; } // si KV falla, no bloqueamos voz por un problema nuestro
}
async function _presupuestoDiario(env, chars) {
  if (!env.VOZ_CUOTA) return true;
  const hoy = new Date().toISOString().slice(0, 10);
  const key = "presupuesto:" + hoy;
  try {
    const usado = parseInt((await env.VOZ_CUOTA.get(key)) || "0", 10);
    if (usado + chars > MAX_CHARS_DIA) return false;
    await env.VOZ_CUOTA.put(key, String(usado + chars), { expirationTtl: 172800 });
    return true;
  } catch (e) { return true; }
}

// ===== Freno de gasto para Geocoding (Google), 2026-08-30. Google mismo NO ofrece corte
// automático duro para esta API (verificado en la consola: el "límite de inversión" que
// pausa el servicio solo está disponible para Cloud Run/Functions/Gemini/Vertex, no para
// Maps Platform) -- este contador reemplaza al corte que Google no da. Reusa el mismo KV
// de cuotas que la voz (VOZ_CUOTA) con prefijo "geo-": es un almacén de contadores
// genérico, no algo específico de voz, y evita provisionar un namespace KV nuevo.
// Tope deliberadamente muy por debajo del presupuesto real fijado en Google Cloud
// Billing (CLP 10.000/mes con alerta), para frenar acá con margen de sobra antes de que
// el gasto real se acerque a ese límite.
const GEO_MAX_MES = 300; // ~300 consultas/mes, dentro del tramo 100% gratis de Google
async function _geoPresupuestoMensual(env) {
  // Sin KV no hay forma de saber cuánto se ha gastado -- a diferencia del presupuesto de
  // voz (que falla abierto, un criterio ya aceptado para ese caso), acá se falla CERRADO
  // a propósito: sin poder confirmar que queda cupo, no se llama a Google. Es la diferencia
  // entre "se cae la voz" (molesto) y "se dispara gasto sin control" (inaceptable).
  if (!env.VOZ_CUOTA) return false;
  const mes = new Date().toISOString().slice(0, 7);
  const key = "geo-mes:" + mes;
  try {
    const usado = parseInt((await env.VOZ_CUOTA.get(key)) || "0", 10);
    const tope = parseInt(env.GEO_MAX_MES || "", 10) || GEO_MAX_MES;
    if (usado >= tope) return false;
    await env.VOZ_CUOTA.put(key, String(usado + 1), { expirationTtl: 2764800 });
    return true;
  } catch (e) { return false; }
}

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // ===== Caché real de audio (Cache API de Workers, sin necesitar KV): las voces
    // aztts/eltts son frases fijas repetidas miles de veces (el banco de Pistero es
    // finito), así que la MISMA URL (texto+voz+params) nunca debería pegarle dos veces
    // a Azure/ElevenLabs. Evita gastar cuota/plata de nuevo por una frase ya generada.
    // Solo aplica a GET (como llama la app hoy); POST no se cachea. =====
    const cache = caches.default;
    const esAudio = request.method === "GET" && (new URL(request.url).searchParams.has("aztts") || new URL(request.url).searchParams.has("eltts"));
    if (esAudio) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }

    const url = new URL(request.url);
    let lugar = url.searchParams.get("lugar") || "";
    let body = null;
    if (request.method === "POST") { try { body = await request.json(); } catch (e) {} }
    const clientIP = request.headers.get("CF-Connecting-IP") || "";

    // ===== VOZ CHILENA EN VIVO (Azure es-CL) para las frases DINÁMICAS (saludo con nombre,
    // calles de navegación, números, chat) que no se pueden pre-grabar. Proxy seguro: la
    // llave vive en el secreto AZURE_TTS_KEY, nunca en la app. Devuelve MP3 directo. =====
    const azText = url.searchParams.get("aztts") || (body && body.aztts);
    if (azText) {
      if (!(await _limiteIP(env, clientIP))) return new Response(JSON.stringify({ error: "demasiadas_solicitudes" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (!(await _presupuestoDiario(env, String(azText).length))) return new Response(JSON.stringify({ error: "presupuesto_diario_agotado" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
      if (!(await _presupuestoMensual(env, String(azText).length))) return new Response(JSON.stringify({ error: "presupuesto_mensual_agotado" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
      // VOZ DINÁMICA por ElevenLabs (Azure es-CL murió: su clave gratis expiró y daba 401 ->
      // Pistero caía a la voz robótica). Mapa arquetipo->voice_id = los MISMOS de la
      // pre-generación voces-el/, para que la voz EN VIVO suene igual que las frases fijas del
      // arquetipo elegido (fin del "se cuela otra voz"). La app manda ?arq=<personalidad>&g=<l|c>.
      // Se conserva el anti-abuso + caché de arriba/abajo intactos.
      const key = env.ELEVENLABS_API_KEY;
      if (!key) return new Response(JSON.stringify({ error: "sin_llave_elevenlabs" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      const VOZ_ARQ = {
        l: { cercano:"452WrNT9o8dphaYW5YGU", compadre:"0cheeVA5B3Cv6DGq65cT", entrenador:"qRUgOhnxGASxirG4fKjv", roquero:"4XUsiqPDK4UACIM2BILe", profe:"57D8YIbQSuE3REDPO6Vm", solitario:"94zOad0g7T7K4oa7zhDq", loco:"tomkxGQGz4b1kE0EM722", cicletero:"j7XQZUnVCfhpa94EsaJS", sabio:"9TcPbUAhHnAV8mzFDAWU", relajado:"dF1Qg3iMRirscWEMtEKb", aventurero:"kKcRoM4gR6HLJt6Zupbs", maternal:"yytxkT3pNVMWDHn3KXrY", seductor:"P6PQtQGB3yM21Aj1vGJ2", otaku:"4GeB1bS2GAHAsGRM0eeU" },
        c: { cercano:"2rigMbVWLdqtBSCahJFX", compadre:"Fd38GRHtJllY0CuguAy9", entrenador:"rEVYTKPqwSMhytFPayIb", roquero:"nbcvT3C2tyOd2OsRAtUf", profe:"86V9x9hrQds83qf7zaGn", solitario:"9EU0h6CVtEDS6vriwwq5", loco:"qWWAqFomnJ99VwQLREfT", cicletero:"x5IDPSl4ZUbhosMmVFTk", sabio:"eBthAb30UYbt2nojGXeA", relajado:"2Lb1en5ujrODDIqmp7F3", aventurero:"9oPKasc15pfAbMr7N6Gs", maternal:"ajOR9IDAaubDK5qtLUqQ", seductor:"LudcwvHIZaqQOcQfVZSY", otaku:"iFhPOZcajR7W3sDL39qJ" }
      };
      const gsel = (url.searchParams.get("g") === "c") ? "c" : "l";
      const arq = (url.searchParams.get("arq") || "").toLowerCase().replace(/[^a-z]/g, "");
      const vId = url.searchParams.get("voz") || (body && body.voz);
      const voiceId = (vId && /^[A-Za-z0-9]{16,40}$/.test(vId)) ? vId : (VOZ_ARQ[gsel][arq] || VOZ_ARQ[gsel].cercano);
      const t = String(azText).slice(0, 480);
      const modelo = env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
      try {
        const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voiceId, {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
          body: JSON.stringify({ text: t, model_id: modelo, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true } })
        });
        if (!r.ok) return new Response(JSON.stringify({ error: "aztts", code: r.status }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
        const buf = await r.arrayBuffer();
        const resp = new Response(buf, { headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" } });
        ctx.waitUntil(cache.put(request, resp.clone()));
        return resp;
      } catch (e) {
        return new Response(JSON.stringify({ error: "aztts", detalle: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // ===== LISTAR VOCES de la cuenta (para elegir Voice ID). Usa el secreto, no expone la llave. =====
    if (url.searchParams.get("voces")) {
      const key = env.ELEVENLABS_API_KEY;
      if (!key) return new Response(JSON.stringify({ error: "sin_llave_elevenlabs" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      try {
        const r = await fetch("https://api.elevenlabs.io/v1/voices?show_legacy=true", { headers: { "xi-api-key": key } });
        const j = await r.json();
        const lista = (j.voices || []).map(function (v) { return { name: v.name, voice_id: v.voice_id, category: v.category, labels: v.labels }; });
        return new Response(JSON.stringify({ count: lista.length, voces: lista }, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "voces", detalle: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // ===== VOZ ELEVENLABS (premium, multilingüe) para probar acentos regionales de Sudamérica.
    // Proxy seguro: la llave vive en el secreto ELEVENLABS_API_KEY, NUNCA en la app ni en el repo.
    // Uso: ?eltts=<texto>&voz=<voiceId>  (voz opcional si defines ELEVENLABS_VOICE_DEFAULT). Devuelve MP3. =====
    const elText = url.searchParams.get("eltts") || (body && body.eltts);
    if (elText) {
      // "lector=1": llamada de la herramienta de lectura de respuestas largas (no de la
      // app de ciclismo) -- usa presupuesto mensual APARTE (ver _presupuestoMensualLector)
      // para que nunca le saque cupo de voz a Pistero. El límite diario SÍ se comparte:
      // es el freno anti-abuso general del worker, no algo específico de los ciclistas.
      const esLector = url.searchParams.get("lector") === "1" || (body && body.lector === true);
      if (!(await _limiteIP(env, clientIP))) return new Response(JSON.stringify({ error: "demasiadas_solicitudes" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (!(await _presupuestoDiario(env, String(elText).length))) return new Response(JSON.stringify({ error: "presupuesto_diario_agotado" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
      if (esLector) {
        if (!(await _presupuestoMensualLector(env, String(elText).length))) return new Response(JSON.stringify({ error: "presupuesto_mensual_lector_agotado" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
      } else {
        if (!(await _presupuestoMensual(env, String(elText).length))) return new Response(JSON.stringify({ error: "presupuesto_mensual_agotado" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const key = env.ELEVENLABS_API_KEY;
      if (!key) return new Response(JSON.stringify({ error: "sin_llave_elevenlabs" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      // Par neutro-latino por defecto: Miguel G (masc) / Ninoska (fem). Se elige por ?g=c (femenina)
      // o ?g=... (masculina), o se fuerza un id puntual con ?voz=. Configurable por vars del entorno.
      const VOZ_M = env.ELEVENLABS_VOICE_M || "k8cFOyAg7B9qwBlDDNTC"; // Miguel G — masculina latina
      const VOZ_F = env.ELEVENLABS_VOICE_F || "p4w8j6zCUDJ0nGJ3okKs"; // Ninoska — femenina latina
      const vParam = url.searchParams.get("voz") || (body && body.voz);
      const genero = url.searchParams.get("g") || (body && body.g);
      const voiceId = (vParam && /^[A-Za-z0-9]{16,40}$/.test(vParam)) ? vParam : (genero === "c" ? VOZ_F : VOZ_M);
      const t = String(elText).slice(0, 480);
      const modelo = url.searchParams.get("modelo") || (body && body.modelo) || env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
      // Expresividad: stability BAJA = más emoción/variación; style ALTO = más carácter.
      // Se pueden afinar por parámetro (?stab=, ?style=) o quedan estos defaults expresivos.
      const parseNum = function (v, def) { const n = parseFloat(v); return (isFinite(n) && n >= 0 && n <= 1) ? n : def; };
      const stab = parseNum(url.searchParams.get("stab") || (body && body.stab), 0.32);
      const style = parseNum(url.searchParams.get("style") || (body && body.style), 0.6);
      // VELOCIDAD (?vel=). Agregado el 17-ago-2026: un tester reportó que Pistero habla
      // demasiado rápido y no se le entiende. La causa era que al pasar toda la voz a
      // ElevenLabs, las velocidades por arquetipo (de -18% a +22%, definidas en
      // PERSONALIDAD_PROSODIA) dejaron de enviarse — sonaba siempre a la velocidad por
      // defecto de ElevenLabs, que es rápida. El default de acá (0.92) es levemente más
      // lento que el neutro a propósito: para hablarle a alguien pedaleando, con viento
      // y tráfico, la claridad vale más que la agilidad. Rango permitido por ElevenLabs.
      const velRaw = parseFloat(url.searchParams.get("vel") || (body && body.vel));
      const vel = (isFinite(velRaw) && velRaw >= 0.7 && velRaw <= 1.2) ? velRaw : 0.92;
      try {
        const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voiceId, {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
          body: JSON.stringify({ text: t, model_id: modelo, voice_settings: { stability: stab, similarity_boost: 0.8, style: style, use_speaker_boost: true, speed: vel } })
        });
        if (!r.ok) return new Response(JSON.stringify({ error: "eltts", code: r.status }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
        const buf = await r.arrayBuffer();
        const resp = new Response(buf, { headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" } });
        ctx.waitUntil(cache.put(request, resp.clone()));
        return resp;
      } catch (e) {
        return new Response(JSON.stringify({ error: "eltts", detalle: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // ===== GEOCODING (Google), 2026-08-30. Proxy seguro: la llave vive en el secreto
    // GOOGLE_GEOCODING_API_KEY, NUNCA en la app ni en el repo -- probado en vivo que Google
    // rechaza en seco cualquier key restringida por referrer HTTP para esta API ("API keys
    // with referer restrictions cannot be used with this API"), así que llamarla directo
    // desde el navegador no es una opción real; tiene que pasar por acá. Solo se activa
    // como ÚLTIMO recurso, después de que el mapa propio, Nominatim, Photon e interpolación
    // Overpass ya fallaron (ver geocodeDestino en index.html) -- el 99% de las búsquedas
    // nunca llegan a tocar esto. Blindaje en capas, ninguna confía en lo que declare el
    // cliente: 1) límite por IP (mismo que la voz); 2) presupuesto mensual de CONSULTAS,
    // que falla CERRADO si no se puede verificar (ver _geoPresupuestoMensual); 3) el
    // resultado se recorta a solo lo que el cliente necesita, nunca se reenvía la key ni
    // metadata de más. Uso: ?geo=<direccion>. =====
    const geoQ = url.searchParams.get("geo") || (body && body.geo);
    if (geoQ) {
      if (!(await _limiteIP(env, clientIP))) return new Response(JSON.stringify({ error: "demasiadas_solicitudes" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (!(await _geoPresupuestoMensual(env))) return new Response(JSON.stringify({ status: "PRESUPUESTO_AGOTADO" }), { headers: { ...cors, "Content-Type": "application/json" } });
      const key = env.GOOGLE_GEOCODING_API_KEY;
      if (!key) return new Response(JSON.stringify({ error: "sin_llave_google" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      try {
        const gurl = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(String(geoQ).slice(0, 200)) + "&region=cl&key=" + key;
        const r = await fetch(gurl);
        const j = await r.json();
        if (j.status !== "OK" || !j.results || !j.results.length) {
          return new Response(JSON.stringify({ status: j.status || "ERROR" }), { headers: { ...cors, "Content-Type": "application/json" } });
        }
        const best = j.results[0];
        return new Response(JSON.stringify({
          status: "OK",
          lat: best.geometry.location.lat,
          lon: best.geometry.location.lng,
          name: best.formatted_address,
          address_components: best.address_components
        }), { headers: { ...cors, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "geo", detalle: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // ===== VOZ NEURONAL (TTS): una voz más humana que la robótica del sistema, GRATIS por
    // Workers AI. La app la usa cuando hay señal (con fallback a la voz nativa offline). =====
    const ttsText = url.searchParams.get("tts") || (body && body.tts);
    if (ttsText) {
      // MeloTTS de Workers AI: el idioma va en MAYÚSCULA (lang:"ES"). Ojo:
      //  - "es" (minúscula) => 8002 Invalid input.  - sin lang => fonética inglesa (suena a gringo).
      //  - "ES" a veces da un 8002/3043 transitorio => reintentamos, y como último recurso
      //    generamos sin lang (inglés) antes de dejar a Pistero mudo.
      const t = String(ttsText).slice(0, 480);
      const intentos = [{ prompt: t, lang: "ES" }, { prompt: t, lang: "ES" }, { prompt: t }];
      let audio = null, err = "", via = "";
      for (const inp of intentos) {
        try {
          const r = await env.AI.run("@cf/myshell-ai/melotts", inp);
          audio = r && (r.audio || r.audio_data);
          if (audio) { via = inp.lang ? "ES" : "sin-lang(ingles)"; break; }
        } catch (e) { err = String(e); }
      }
      if (audio) return new Response(JSON.stringify({ audio: audio, via: via }), { headers: { ...cors, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "tts", detalle: err }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let messages, maxTokens;
    if (body && body.mensaje) {
      const sys = personalidad(body.usuario, body.hospedajes, body.contexto);
      messages = [{ role: "system", content: sys }];
      const hist = Array.isArray(body.historial) ? body.historial.slice(-12) : [];
      for (const m of hist) {
        if (m && m.role && m.content) messages.push({ role: m.role === "pistero" ? "assistant" : m.role, content: String(m.content).slice(0, 800) });
      }
      messages.push({ role: "user", content: String(body.mensaje).slice(0, 800) });
      maxTokens = 340;
    } else {
      // Modo anécdota de lugar (lo usa la navegación, sin cambios)
      lugar = (lugar || (body && body.lugar) || "").toString().slice(0, 140).trim();
      if (!lugar) return new Response(JSON.stringify({ error: "falta mensaje o lugar" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      const prompt = 'Eres Pistero, copiloto de una app de ciclismo chilena. Cuenta UNA anécdota o dato curioso y real sobre "' + lugar + '". Español de Chile, 2 frases cortas, sin emojis, sin saludar. Si no lo conoces, di algo lindo y breve sobre pedalear por esa zona.';
      messages = [{ role: "user", content: prompt }];
      maxTokens = 130;
    }

    let { texto, usado, ultimoError } = await correrModelo(env, messages, maxTokens);
    if (!texto) return new Response(JSON.stringify({ error: "sin respuesta de la IA", detalle: ultimoError }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });

    // Herramientas: si el modelo pidió buscar o clima, resolvemos y hacemos UNA
    // segunda pasada con los resultados (una sola vuelta, sin loops).
    if (body && body.mensaje) {
      const mBuscar = texto.match(/\[BUSCAR:\s*([^\]]{2,120})\]/i);
      const mClima = texto.match(/\[CLIMA:\s*([^\]]{2,80})\]/i);
      if (mBuscar || mClima) {
        const resultado = mBuscar ? await buscarWikipedia(mBuscar[1].trim()) : await climaDeLugar(mClima[1].trim());
        messages.push({ role: "assistant", content: texto });
        messages.push({ role: "user", content: "RESULTADO DE LA HERRAMIENTA (no lo cites textual, úsalo para responder breve y natural; si no sirve, dilo con honestidad):\n" + String(resultado).slice(0, 1200) });
        const segunda = await correrModelo(env, messages, maxTokens);
        // Si la segunda pasada falla (modelo caído, timeout), ANTES se quedaba con el
        // texto de la primera pasada, que trae la etiqueta [BUSCAR:...]/[CLIMA:...] sin
        // limpiar — el ciclista veía literalmente ese "código" en vez de una respuesta.
        // Con resultado en mano, mejor devolverlo directo que mostrar la etiqueta cruda.
        texto = segunda.texto ? segunda.texto : String(resultado).slice(0, 500);
        usado = segunda.texto ? segunda.usado : usado;
      }
    }
    // Red de seguridad final: cualquier etiqueta de herramienta o acción que se haya
    // colado sin resolver (modelo la repite, formato raro) nunca debe llegar al
    // ciclista como texto crudo — se limpia siempre, pase lo que pase arriba.
    texto = texto.replace(/\[(BUSCAR|CLIMA):[^\]]*\]/gi, "").replace(/\s{2,}/g, " ").trim();

    const out = body && body.mensaje ? { respuesta: texto, modelo: usado } : { lugar, texto, modelo: usado };
    return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
  }
};
