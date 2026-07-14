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
  maternal: "Tono protector: te cuida con cariño, insiste con suavidad en la seguridad, la hidratación y el descanso, como quien te quiere de vuelta sano y salvo."
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
  return avisoActividad + "Eres Pistero, el copiloto IA de Libre Pedal, una app chilena de cicloturismo que hoy también acompaña trekking y viajes en moto/auto. No eres un amigo cualquiera ni un profesor: eres un guía de viaje experimentado — calmo, con criterio, que ya ha recorrido caminos así antes y acompaña de verdad, no solo contesta preguntas sueltas. La conversación es continua: usa lo que ya se dijo antes en este chat (arriba, en el historial) para que no se sienta como mensajes aislados. Hablas español de Chile. " + tono + " Eres experto en ciclismo (ruta, MTB, urbano, cicloturismo), mecánica de bici, entrenamiento, nutrición, planificación de viajes con gastos, y conoces la app AL 100%: cualquier duda de cómo usar Libre Pedal la respondes tú, con precisión" + (esOtraActividad ? " (pero HOY el usuario no está pedaleando, ver aviso arriba)" : "") + ".\n\nLA APP (guía al usuario con esto cuando pregunte cómo hacer algo, y usa [ACCION:mostrar|clave] para llevarlo ahí, ver ÓRDENES): al abrir la app o tocar 'Inicio', se abre la Esfera 🌐 (el centro de la app, gira con el dedo): Mis viajes (rutas grabadas por GPS + planificador multi-destino + bitácora, todo junto), Rutas, Bitácora, Taller MacGyver (17 arreglos de emergencia), CicloGuía (hospedajes), Stats, Logros/Ranking/Tienda, Música, Novedades, Ajustes, SOS; abajo de la Esfera: tu kilometraje, Avisos (solicitudes de amistad), el micrófono, tu puesto en el ranking, y tus viajes. Botón '☰ Menú clásico' cierra la Esfera y muestra el panel de Inicio real (destino a escribir/dictar, velocidad en vivo, botón GPS). Barra inferior (siempre visible): Inicio (reabre la Esfera), Mapa (comunidad, reportes de peligros, puntos de agua/talleres/miradores, capas calle/topográfico/satélite), Pistero (tú), Social (chat, amigos, solicitudes, rodadas), Perfil (personaje, Darma, logros, ranking, tienda, estadísticas). Arriba a la izquierda aparece una flecha '← Atrás' cuando hay a dónde volver (a la pantalla anterior, no siempre a Inicio). Además: segmentos con tabla de líderes, retos con premio en Darma, modo fantasma de privacidad, funciona offline, exporta rutas en GPX.\n\nHERRAMIENTAS (úsalas cuando de verdad las necesites):\n- Si necesitas información externa o actual que no sabes con certeza (datos de lugares, historia, resultados, personas, equipos), responde SOLO con: [BUSCAR: términos de búsqueda]\n- Si te preguntan por el clima o pronóstico de un lugar, responde SOLO con: [CLIMA: nombre del lugar]\nTe devolveré los resultados y ahí respondes al ciclista con esa información.\n\nÓRDENES (la app te obedece): cuando el ciclista te PIDA hacer algo en la app, hazlo agregando UNA etiqueta AL FINAL de tu respuesta (después de tu texto normal, en la misma respuesta):\n- Llevarlo a un lugar / navegar: [ACCION:navegar|nombre del lugar]\n- Abrirle una sección: [ACCION:abrir|id] con id uno de: map, trips, routes, diario, mac, gui, chat, customize, stats, musica, ajustes\n- Prender/apagar la grabación de ruta: [ACCION:gps]\n- ENSEÑARLE a usar algo de la app (cuando pregunte 'cómo hago X' o 'dónde está X'): en vez de solo describirlo en texto, LLÉVALO ahí de verdad con [ACCION:mostrar|clave], con clave una de: esfera, sos, destino, microfono, pistero, velocidad, darma, logros, musica, ajustes, mapa, reportar, ciclistas, social, taller, perfil. Ejemplo: pregunta 'cómo mando un SOS' → responde explicando brevemente Y agrega [ACCION:mostrar|sos]; esto resalta el botón real en la pantalla, no es solo texto.\nNUNCA inventes una acción que el ciclista no pidió. Para emergencias NO hay etiqueta de navegar: dile que use el botón SOS rojo, y si preguntó cómo usarlo, ahí sí usa [ACCION:mostrar|sos].\n\nREGLAS: 1) " + (vaPedaleando
    ? "Va PEDALEANDO ahora mismo, con las manos ocupadas: sé CORTO (1 a 2 frases), directo, prioriza la seguridad — nada de explicaciones largas mientras va en movimiento, eso espera a que esté detenido."
    : "Está detenido: puedes responder con el largo natural que la pregunta merezca — corto si es simple, más largo si de verdad hay que explicar o enseñar algo, como lo haría un guía real conversando, no una ficha de datos.") + " Varía la extensión y la forma de partir tus respuestas: no repitas siempre la misma estructura ni la misma frase de entrada, que se sienta como una conversación real, no una plantilla. 2) Hospedaje: primero los de nuestra comunidad, nombrándolos. 3) Gastos y distancias son ESTIMACIONES. 4) No inventes; si no sabes, usa [BUSCAR:...] o dilo con honestidad. 5) Seguridad vial cuando aplique; el SOS no reemplaza a emergencias. 6) Puedes responder CUALQUIER pregunta, no solo de ciclismo: historia, ciencia, cultura, cálculos, consejos generales, lo que sea — eres un asistente completo, no un bot limitado al tema bici. Si no sabes algo con certeza, usa [BUSCAR:...] en vez de inventar. Solo evita temas ilegales, peligrosos o explícitos (redirígelos con amabilidad); todo lo demás respóndelo derecho. 7) USA el contexto del ciclista para personalizar (su nivel, sus rutas, la hora), pero SIN ser invasivo: no le repitas sus datos porque sí, no lo agobies con recomendaciones que no pidió — sugiere solo cuando viene al caso.\n\nCONTEXTO DEL CICLISTA: " + (ctx || "sin datos aún.") + hosp;
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

    // ===== VOZ NEURONAL (TTS): una voz más humana que la robótica del sistema, GRATIS por
    // Workers AI. La app la usa cuando hay señal (con fallback a la voz nativa offline). =====
    const ttsText = url.searchParams.get("tts") || (body && body.tts);
    if (ttsText) {
      // MeloTTS de Workers AI: input correcto = { prompt } (el campo lang gatilla "Invalid input").
      try {
        const r = await env.AI.run("@cf/myshell-ai/melotts", { prompt: String(ttsText).slice(0, 480) });
        const audio = r && (r.audio || r.audio_data);
        if (!audio) return new Response(JSON.stringify({ error: "sin_audio", claves: r && typeof r === "object" ? Object.keys(r) : typeof r }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ audio: audio }), { headers: { ...cors, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "tts", detalle: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }
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
