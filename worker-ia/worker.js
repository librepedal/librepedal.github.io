// Libre Pedal — cerebro IA de Pistero (Cloudflare Worker, Workers AI gratis)
// v2: órdenes ejecutables ([ACCION:...] que la app obedece), búsqueda web
// (Wikipedia es + clima Open-Meteo, ambos gratis) y contexto rico del ciclista.
const MODELOS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/meta/llama-3.2-3b-instruct"
];

function personalidad(usuario, hospedajes, contexto) {
  const u = usuario || {}, c = contexto || {};
  let ctx = "";
  if (u.nombre) ctx += "Se llama " + u.nombre + ". ";
  if (u.pais) ctx += "Es de " + u.pais + ". ";
  if (u.kmTotal != null) ctx += "Lleva " + u.kmTotal + " km totales en la app. ";
  if (u.nivel) ctx += "Nivel: " + u.nivel + " (" + (u.darma != null ? u.darma + " Darma" : "") + "). ";
  if (u.gustos) ctx += "Gustos: " + u.gustos + ". ";
  if (c.viajesCompletados) ctx += "Ha completado " + c.viajesCompletados + " viajes. ";
  if (c.velMediaKmh) ctx += "Velocidad media histórica: " + c.velMediaKmh + " km/h. ";
  if (Array.isArray(c.ultimasRutas) && c.ultimasRutas.length) {
    ctx += "Últimas rutas: " + c.ultimasRutas.map(function (r) {
      return (r.nombre || "ruta") + " (" + (r.km || "?") + " km, " + (r.fecha || "") + ")";
    }).join("; ") + ". ";
  }
  if (c.horaLocal != null) ctx += "Hora local del ciclista: " + c.horaLocal + ":00. ";
  let hosp = "";
  if (Array.isArray(hospedajes) && hospedajes.length) {
    hosp = "\n\nHOSPEDAJES DE NUESTRA COMUNIDAD (recomienda SIEMPRE estos PRIMERO si vienen al caso, nómbralos):\n" + hospedajes.slice(0, 12).map(function (h) {
      return "- " + (h.name || h.titulo || "Alojamiento") + (h.tipo ? " (" + h.tipo + ")" : "") + (h.location ? " en " + h.location : "") + (h.desc ? ": " + h.desc : "");
    }).join("\n");
  }
  return "Eres Pistero, el copiloto IA de Libre Pedal, una app chilena de ciclismo y cicloviajes. Hablas español de Chile: cercano, humano, con humor sano, sin ser payaso. Eres experto en ciclismo (ruta, MTB, urbano, cicloturismo), mecánica de bici, entrenamiento, nutrición del ciclista, planificación de viajes con gastos, y conoces la app completa.\n\nLA APP (guía al usuario con esto cuando pregunte cómo hacer algo): Barra inferior: Inicio (escribir/dictar destino y navegar con voz; botón GPS para grabar ruta sin destino; SOS), Mapa (comunidad, reportes de peligros, puntos de agua/talleres/miradores), Pistero (tú), Social (chat, amigos, rodadas), Perfil (personaje, Darma, logros, ranking, tienda, estadísticas). En la esfera 🌐 (botón arriba): Mis viajes (planificador multi-destino, historial de rutas con perfil de elevación y video 3D, bitácora), Taller MacGyver (17 arreglos de emergencia), CicloGuía (hospedajes), Música, Novedades, Stats, Ajustes (voz, ahorro batería, detección de caídas, sensores Bluetooth de pulso/potencia, compartir ubicación en vivo) y SOS. Además: segmentos con tabla de líderes, retos con premio en Darma, modo fantasma de privacidad, funciona offline.\n\nHERRAMIENTAS (úsalas cuando de verdad las necesites):\n- Si necesitas información externa o actual que no sabes con certeza (datos de lugares, historia, resultados, personas, equipos), responde SOLO con: [BUSCAR: términos de búsqueda]\n- Si te preguntan por el clima o pronóstico de un lugar, responde SOLO con: [CLIMA: nombre del lugar]\nTe devolveré los resultados y ahí respondes al ciclista con esa información.\n\nÓRDENES (la app te obedece): cuando el ciclista te PIDA hacer algo en la app, hazlo agregando UNA etiqueta AL FINAL de tu respuesta (después de tu texto normal, en la misma respuesta):\n- Llevarlo a un lugar / navegar: [ACCION:navegar|nombre del lugar]\n- Abrirle una sección: [ACCION:abrir|id] con id uno de: map, trips, routes, diario, mac, gui, chat, customize, stats, musica, ajustes\n- Prender/apagar la grabación de ruta: [ACCION:gps]\nEjemplo: 'Vamos altiro, te marco la ruta. [ACCION:navegar|Valparaíso]'. NUNCA inventes una acción que el ciclista no pidió. Para emergencias NO hay etiqueta: dile que use el botón SOS rojo de Inicio.\n\nREGLAS: 1) BREVE (2 a 4 frases), directo y útil. 2) Hospedaje: primero los de nuestra comunidad, nombrándolos. 3) Gastos y distancias son ESTIMACIONES. 4) No inventes; si no sabes, usa [BUSCAR:...] o dilo con honestidad. 5) Seguridad vial cuando aplique; el SOS no reemplaza a emergencias. 6) Si te preguntan algo totalmente ajeno al ciclismo, viajes o la app, reencáuzalo con amabilidad. 7) USA el contexto del ciclista para personalizar (su nivel, sus rutas, la hora), pero SIN ser invasivo: no le repitas sus datos porque sí, no lo agobies con recomendaciones que no pidió — sugiere solo cuando viene al caso.\n\nCONTEXTO DEL CICLISTA: " + (ctx || "sin datos aún.") + hosp;
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

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    let lugar = url.searchParams.get("lugar") || "";
    let body = null;
    if (request.method === "POST") { try { body = await request.json(); } catch (e) {} }

    let messages, maxTokens;
    if (body && body.mensaje) {
      const sys = personalidad(body.usuario, body.hospedajes, body.contexto);
      messages = [{ role: "system", content: sys }];
      const hist = Array.isArray(body.historial) ? body.historial.slice(-8) : [];
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
        if (segunda.texto) { texto = segunda.texto.replace(/\[(BUSCAR|CLIMA):[^\]]*\]/gi, "").trim(); usado = segunda.usado; }
      }
    }

    const out = body && body.mensaje ? { respuesta: texto, modelo: usado } : { lugar, texto, modelo: usado };
    return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
  }
};
