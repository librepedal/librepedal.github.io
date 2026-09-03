/* ===== FAQ de Pistero: preguntas sobre la app y sobre ciclismo en general.
   Reglas simples por patrón (nada de servidor ni IA externa: gratis y offline-friendly).
   Se revisan justo antes de asumir que dijiste un destino, así una pregunta nunca
   termina armando un viaje por error. ===== */
const FAQ_APP=[
  {r:/qui[eé]n eres|qu[eé] eres tu|qu[eé] es pistero/, a:"Soy Pistero, tu copiloto ciclista. Te guío por voz, te acompaño en cada ruta y te cuento datos reales de los lugares por donde pasas."},
  {r:/qu[eé] es (el )?darma|c[oó]mo gano darma|c[oó]mo consigo darma/, a:"Darma son los puntos que ganas aportando a la comunidad: reportando peligros, agregando puntos en el mapa o completando retos. Con Darma desbloqueas cascos, colores y accesorios en la tienda."},
  {r:/qu[eé] es (el )?modo fantasma/, a:"El modo fantasma te oculta del mapa de otros ciclistas. Lo activas y desactivas cuando quieras desde el botón de arriba, junto a tu nivel."},
  {r:/c[oó]mo funciona el sos|qu[eé] hace el bot[oó]n sos/, a:"El botón SOS abre WhatsApp con tu ubicación lista para mandar a tus contactos de emergencia. No reemplaza a Carabineros ni al SAMU, pero avisa rápido a quien tú elijas."},
  {r:/qu[eé] es (la )?cicloguia|d[oó]nde busco hostales|d[oó]nde busco alojamiento/, a:"La CicloGuía tiene hostales, camping y panoramas cerca tuyo, con comentarios de otros ciclistas. También puedes publicar un alojamiento nuevo marcándolo en el mapa."},
  {r:/qu[eé] es (el )?taller macgyver|c[oó]mo arreglo (la bici|un pinchazo|la cadena)/, a:"El Taller MacGyver tiene diecisiete trucos para reparar tu bici con lo que tengas a mano: pinchazos, cadena, frenos y más. Lo encuentras en la sección Taller."},
  {r:/qu[eé] es (el )?seguimiento en vivo|c[oó]mo comparto mi ubicaci[oó]n/, a:"El seguimiento en vivo genera un link temporal para que alguien te siga en tiempo real mientras pedaleas. Lo activas desde Ajustes y se desactiva solo cuando terminas."},
  {r:/qu[eé] son los segmentos|c[oó]mo compito por un r[eé]cord/, a:"Los segmentos son tramos fijos donde compites por el mejor tiempo con otros ciclistas, con tabla de líderes. Se marcan automático cuando pasas por uno."},
  {r:/qu[eé] cascos hay|c[oó]mo cambio (mi casco|de casco)|c[oó]mo personalizo mi (personaje|perfil|avatar)/, a:"Tienes dieciocho cascos, lentes, tono de piel, color de ojos y labios, vello facial, peinados y pañoletas para armar tu personaje a tu gusto. Entra a Perfil y toca Personalizar para probártelos."},
  {r:/qu[eé] es la esfera/, a:"La esfera es el lanzador de aplicaciones de Libre Pedal: gira con el dedo y toca un ícono para entrar a cualquier sección."},
  {r:/en qu[eé] puesto (voy|estoy)|cu[aá]l es mi (puesto|posici[oó]n|ranking)/, a:"Entra a Estadísticas y ahí te muestro tu puesto actual en el ranking general."},
  {r:/qu[eé] (funciones tiene|puedes hacer|hace) (la app|libre pedal)|para qu[eé] sirve (esta app|libre pedal)/, a:"Te guío por voz como Waze, grabo tu ruta sola, te conecto con la comunidad de ciclistas, te aviso peligros y pendientes, y llevo tus estadísticas. Pregúntame por cualquier función y te explico."},
  // Reporte real de Inty (2026-09-03): "de hace rato no escucho alguna broma".
  // En vez de contestar algo fijo (podría no ser cierto en su caso puntual), esto
  // dispara el diagnóstico real de por qué -- ver _pisteroExplicarBromas() en
  // pistero-diag.js. Necesitaba ser hablado, no de consola: no hay forma de pedirle
  // a alguien que abra devtools en su celular sin cable y compu al lado.
  {r:/no (me )?(cuentas?|dices?|tiras?|has dicho) (ninguna |alguna )?(broma|bromas|talla|tallas|chiste|chistes)\b|por qu[eé] (ya )?no (cuentas|dices|tiras) (bromas|tallas|chistes)|dejaste de (tirar tallas|contar (bromas|chistes))|hace rato no (escucho|oigo).{0,15}(broma|talla|chiste)/, a:function(){ if(typeof _pisteroExplicarBromas==='function') _pisteroExplicarBromas(); else h('Dame un segundo, ese diagnóstico no cargó bien todavía.'); }},
];
const FAQ_CICLISMO=[
  {r:/cada cu[aá]nto (debo|hay que|tengo que) (hidratarme|tomar agua|beber agua)/, a:"Lo ideal es hidratarte cada quince a veinte minutos, unos quinientos a setecientos cincuenta mililitros por hora. Yo te lo recuerdo solo durante la ruta."},
  {r:/qu[eé] (como|debo comer) antes de (una ruta|salir a pedalear|andar en bici)/, a:"Antes de salir, algo con carbohidratos de fácil digestión: pan, plátano o avena. En rutas de más de una hora, come algo liviano cada cuarenta y cinco minutos."},
  {r:/qu[eé] presi[oó]n (de|le pongo a) (los neum[aá]ticos|las ruedas|la bici)/, a:"Depende del neumático, pero como referencia: entre sesenta y ochenta psi en ruta, y menos, entre treinta y cinco y cincuenta, si andas en camino de tierra."},
  {r:/c[oó]mo elijo (un casco|el casco)|qu[eé] casco (compro|uso)/, a:"Lo más importante es que te quede firme sin apretar, cubra bien la frente, y tenga certificación de seguridad vigente. La ventilación y el peso son gusto personal."},
  {r:/me duelen las rodillas|dolor de rodillas pedaleando/, a:"Casi siempre es la altura del asiento. Prueba subirlo un poco: con el pedal abajo, la pierna debería quedar casi estirada, sin bloquear la rodilla."},
  {r:/cada cu[aá]nto (reviso|cambio) la cadena/, a:"Revisa el estiramiento de la cadena cada mil kilómetros más o menos, y límpiala seguido. Una cadena gastada desgasta los piñones más rápido."},
  {r:/c[oó]mo evito (que se me duerman las manos|el dolor de manos)/, a:"Cambia la posición de las manos en el manubrio de vez en cuando, y revisa que el manubrio no quede más bajo que el asiento."},
];
// ===== Charla casual: reporte real de Inty — le preguntó "¿cómo estás?" a
// Pistero y se quedó callado. Causa real: "como estas" estaba en la lista de
// palabras "vacías" que la app descarta (tratada igual que "hola" u "ok" sueltos,
// sin ninguna respuesta real) — no es que fallara, es que ni siquiera se lo
// tomaba como una pregunta de verdad. Un amigo no hace eso. Estas son las
// preguntas de charla común que un ciclista/viajero le haría a su copiloto sin
// que sean sobre la app ni sobre ciclismo — cada una con VARIAS respuestas (no
// la misma siempre) para que no suene a grabación. */
const FAQ_CHARLA=[
  {r:/^(y\s+)?(como|que tal|q\s*tal)\s*(estas|andas|vas|te va|andai|estai)\b|^como estai\b|^todo bien\??$/, a:[
    "¡Todo piñón! Listo para acompañarte donde vayas hoy.",
    "De diez, con las pilas puestas. ¿Y tú, cómo vienes?",
    "Ahí ando, siempre con ganas de rodar. ¿Cómo va tu día?",
    "Bien acá, esperando que salgamos a dar unas vueltas. ¿Vamos?"
  ]},
  {r:/gracias|te pasaste|eres un crack|eres el mejor|buena esa|se agradece/, a:[
    "De nada, para eso estoy. ¡Sigamos rodando!",
    "Un gusto ayudarte, siempre a la orden.",
    "¡Ese es el espíritu! Cuenta conmigo cuando quieras."
  ]},
  {r:/\b(chao|adios|adi[oó]s|nos vemos|hasta luego|hasta pronto|me voy|nos hablamos)\b/, a:[
    "¡Nos vemos! Anda con cuidado por ahí.",
    "Chao, que tengas linda ruta. Aquí estaré cuando vuelvas.",
    "Hasta la próxima. ¡Cuídate!"
  ]},
  {r:/te quiero|eres el mejor amigo|eres genial|me caes bien/, a:[
    "Yo también te tengo cariño, colega. Vamos a seguir sumando kilómetros juntos.",
    "Que bueno que andamos en la misma sintonía. ¡A rodar se ha dicho!"
  ]},
  {r:/^(jaja+|jeje+|que risa|muy bueno eso|buena esa broma)\.?$/, a:[
    "😄 Me gusta que te rías, así se disfruta más la ruta.",
    "Ja, sabía que te iba a sacar una sonrisa."
  ]},
  {r:/^(hola|holis|buenas|hey|ep|quiubo|qui[uú]bo)\.?$/, a:[
    "¡Hola! ¿Listo para salir a rodar?",
    "¡Qué tal! Aquí ando, esperando la próxima ruta.",
    "Hola, colega. ¿Vamos a algún lado hoy?"
  ]}
];
function responderPreguntaGeneral(t){
  for(let i=0;i<FAQ_CHARLA.length;i++){ if(FAQ_CHARLA[i].r.test(t)){ const arr=FAQ_CHARLA[i].a; h(arr[Math.floor(Math.random()*arr.length)]); return true; } }
  // FAQ_APP.a puede ser un string fijo o una función (respuesta que depende de
  // estado real, ej. el diagnóstico de bromas -- ver pistero-diag.js).
  for(let i=0;i<FAQ_APP.length;i++){ if(FAQ_APP[i].r.test(t)){ const a=FAQ_APP[i].a; if(typeof a==='function') a(); else h(a); return true; } }
  for(let i=0;i<FAQ_CICLISMO.length;i++){ if(FAQ_CICLISMO[i].r.test(t)){ h(FAQ_CICLISMO[i].a); return true; } }
  return false;
}
function handleVoiceCommand(raw){
  trackEvent('funcion','voz');
  const t=normalizar(raw);
  // Si hay un selector de rutas alternativas esperando respuesta, la frase se
  // interpreta como una elección PRIMERO (con máxima prioridad) — si no matchea
  // ninguna opción válida, sigue de largo al enrutador normal (así "cállate"
  // sigue funcionando igual aunque el selector esté abierto).
  if(_rutaAlternativaEnEspera){
    const _idxRuta=_detectarEleccionRutaPorVoz(t);
    if(_idxRuta!=null && window._resolverEleccionRuta){ window._resolverEleccionRuta(_idxRuta); return; }
  }
  // Comando de interrupción inmediata: corta lo que Pistero esté diciendo YA (no
  // espera a que termine la frase) y de paso silencia la voz hasta que digas "habla".
  // Antes "cállate/silencio" solo apagaba la voz a futuro, sin cortar lo que sonaba.
  // "para"/"ya" quedan SOLO como palabra suelta exacta (anchored): son demasiado
  // comunes dentro de frases normales ("¿cuánto para llegar?", "ya casi llego") como
  // para buscarlas en cualquier parte de la frase sin generar silencios por accidente.
  // El resto ("cállate", "silencio", "no hables más"...) sí se busca en cualquier
  // parte: son frases distintivas y con "por favor"/"porfa" pegado atrás (muy natural
  // al pedir esto en voz alta) el anclado antiguo nunca las agarraba — en vez de
  // callarse, Pistero armaba un viaje falso a "callate por favor" (mismo bug que
  // pendiente/mapa/rutas más abajo, pero en el comando que más urge que funcione:
  // silenciar la voz mientras vas pedaleando).
  if(/^(detente|para|ya)\.?$/.test(t) || /c[aá]llate|\bcalla\b|silencio|no hables m[aá]s|deja(te)? de hablar|quiero silencio|no digas nada|basta ya/.test(t)){ try{ if(window.PisteroMemoria) PisteroMemoria.registrarSilencio(); }catch(e){} pararVoz(); vozActiva=false; localStorage.setItem('lp_voz','off'); const b=document.getElementById('vozBtn'); if(b) b.innerHTML='<i class="fas fa-volume-xmark"></i> Voz: OFF'; return; }
  // Las preguntas ("qué es...", "cómo...", "cada cuánto...") se resuelven ANTES que
  // los comandos sueltos de más abajo: si no, por ejemplo "qué hace el botón SOS" caía
  // en el comando de emergencia real solo por contener la palabra "sos".
  if(responderPreguntaGeneral(t)) return;
  // El clima ANTES que nada más: "cómo voy a ver el clima" o "cómo está el clima"
  // contienen "voy a"/"como" — sin este chequeo temprano, el regex de destino de más
  // abajo las tomaba como "llévame a ver el clima" y armaba un viaje falso a un lugar
  // llamado literalmente "el clima". Responde con datos reales (Open-Meteo, el mismo
  // que ya usa el resumen de ruta) en vez de mandarlo a la IA general, que no tiene
  // acceso a clima en vivo y por eso "no sabía" responder bien.
  if(/\bclima\b|\btemperatura\b|va a llover|c[oó]mo (est[aá]|anda) el tiempo|qu[eé] tiempo hace|qu[eé] clima hace/.test(t)){ _pisteroDecirClima(raw); return; }
  // Bug real (2026-08-31): el SOS real vivía mucho más abajo en esta cadena, DESPUÉS del
  // reporte comunitario de "accidente" (más abajo: "pacos, animal atropellado, objeto,
  // taco, ACCIDENTE"). REPORTE_VOZ.accidente matchea con /\baccidente\b|\batropell\w*/,
  // que también calzan con "tuve un accidente" y "me atropellaron" — las mismas frases que
  // este chequeo de SOS busca. Como el reporte comunitario se evaluaba primero, alguien
  // reportando SU PROPIO accidente por voz nunca llegaba a disparar la alerta de emergencia
  // real (números 131/132/133, contactos): quedaba silenciosamente publicado como un aviso
  // para otros ciclistas. Se sube el chequeo de SOS a ACÁ, antes de cualquier reporte
  // comunitario — sigue yendo después del FAQ (que ya resuelve "qué hace el botón SOS" sin
  // disparar el real) y del clima, así que no reabre ese bug ya arreglado. enviarSOS() solo
  // abre un modal para confirmar/llamar, no marca nada solo, así que un falso positivo acá
  // cuesta un toque de más — mucho más barato que silenciar una emergencia real.
  if(/\bsos\b|emergencia|auxilio|socorro|ayuda urgente|^ay[uú]da[.!]?$|tuve un accidente|me accident|me atropell|\bme cai\b|me lastim|estoy herido|no puedo (moverme|levantarme)|necesito una? ambulancia/.test(t)){ enviarSOS(); return; }
  // Consulta sobre peligros en una ruta ("¿hay policías en mi ruta a X?"): va
  // ANTES del reporte rápido, porque comparte las mismas palabras clave
  // (policía, taco, accidente...) pero es una pregunta, no un aviso. Solo se
  // toma como consulta si hay un destino explícito o una frase de pregunta
  // clara — así "hay pacos en el camino" (un aviso normal, sin destino) sigue
  // yendo al reporte de siempre.
  {
    const _catConsulta=_detectarReporteVoz(t);
    if(_catConsulta){
      const _destinoConsulta=_extraerDestinoConsulta(t);
      if(_destinoConsulta || CONSULTA_RUTA_OPENER_RE.test(t)){ consultarPeligrosEnRuta(_catConsulta, _destinoConsulta).then(h); return; }
    }
  }
  // Reportes de peligro por voz (pacos, animal atropellado, objeto en la vía,
  // taco, accidente): van directo al mapa comunitario, sin pasar por la IA
  // general ni por ningún formulario — para eso es "manos libres" de verdad.
  { const _catRep=_detectarReporteVoz(t); if(_catRep){ reportarPorVozRapido(_catRep).then(h); return; } }
  // Llamar por voz: "Pistero, llama a mama" / "marcale a Juan" / "llama a emergencias".
  { const _ll=t.match(/^(?:pistero[,:]?\s*)?(?:llama(?:me|le|r|los)?|marca(?:le|r)?|telefonea(?:le|r)?)\s+(?:a\s+la|al|a)\s+(.+)/); if(_ll && _ll[1]){ pisteroLlamar(_ll[1]); return; } }
  if(/esfera|men[uú]( principal)?|lanzador|aplicaciones|todas las apps/.test(t)){ abrirEsfera(); h('Aquí está la esfera de aplicaciones.'); return; }
  // (me)? y una ventana de hasta 20 caracteres (en vez de una lista fija de
  // artículos) para que "guárdame el viaje" y "guarda ESTA ruta" también calcen —
  // con la lista fija anterior (solo "el/la/mi") esas dos frases tan naturales no
  // matcheaban NADA y terminaban en otro comando por accidente (abrían Rutas/Viajes
  // en vez de guardar), un guardado real que el ciclista pide y no pasa nada.
  // "bitácora" ANTES del patrón genérico de guardar (si no, "guarda...viaje" de
  // más abajo la interceptaría primero y nunca llegaría a preguntar hospedaje/notas).
  if(/(guarda|guardar|graba|grabar)(me)?\b.{0,25}\bbit[aá]cora/.test(t)){ guardarBitacoraViaje(); return; }
  // Si el usuario activó "Bitácora de viajes" en Ajustes, hasta el guardado genérico
  // ("guarda mi viaje", sin decir "bitácora") ofrece hospedaje+notas — es lo que dice
  // el texto de Ajustes al activarlo. Con la preferencia apagada (por defecto), este
  // guardado sigue siendo el rápido y silencioso de siempre.
  if(/(guarda|graba|termina|finaliza|acaba)(r|me)?\b.{0,20}\b(viaje|ruta)/.test(t)){ if(bitacoraViajesOn){ guardarBitacoraViaje(); return; } if(document.getElementById('nav-screen').classList.contains('active')){ finishTrip(); } else if(ig){ autoGuardarRuta(true,false); } else { h('Activa el GPS para empezar a grabar tu ruta.'); } return; }
  if(/sigamos|sigue con el viaje|continuar el viaje|contin[uú]a el viaje|retoma|reanuda|quiero seguir pedaleando|dale que sigo/.test(t)){ if(!ig && !document.getElementById('nav-screen').classList.contains('active')){ toggleGPS(); } else { h('Seguimos, ya estoy registrando tu viaje.'); } return; }
  if(/treki|trakea|trackea|\btrack|sigue la ruta|sigue registrando|sigue grabando|registra mi recorrido|anota mi ruta|inicia el registro/.test(t)){ if(!ig){ toggleGPS(); } else { h('Sigo registrando tu ruta, tranquilo.'); } return; }
  // OJO: "busca"/"encuentra" ANTES exigían el complemento de lugar (" la dirección de",
  // " ruta a", " lugar") de forma OPCIONAL — por eso CUALQUIER pregunta que arrancara
  // con "busca..." o "encuentra..." (ej. "búscame información sobre...", "encuentra un
  // consejo para...", frases sueltas del habla normal) se armaba como viaje a un lugar
  // inexistente, fallaba el geocode y terminaba en "no encontré ese destino". Ahora ese
  // complemento es OBLIGATORIO: sin él, la frase sigue de largo hasta el enrutador de
  // preguntas/órdenes de más abajo, que es lo que corresponde.
  let m=t.match(/(?:planifica(?:r)?(?:me)?(?: mi| el| un)? viaje (?:a|hasta|hacia|para)|ir (?:a|hasta|hacia)|llevame (?:a|hasta|hacia)|llevarme a|lleva(?:me)? (?:a|hasta|hacia)|anda(?:me)? a|navega(?:r|me)? (?:a|hasta|hacia)|guia(?:r|me)? (?:a|hasta|hacia)|vamos (?:a|hasta)|vamonos a|quiero (?:ir|llegar|pedalear) (?:a|hasta|hacia)|voy a|arranca(?:r|me)? (?:a|hasta|hacia)|parte(?:me)? (?:a|hasta|hacia|para)|salgo (?:a|hasta|hacia|para)|trazame (?:la ruta|el camino) (?:a|hasta|hacia)|muestrame el camino (?:a|hasta|hacia)|ruta (?:a|hasta|hacia|para)|como (?:llego|voy) a|llegar a|necesito ir a|busca(?:r|me)?(?: la| el)? (?:direccion(?: de)?|ruta a|lugar)|encuentra(?: la)? direccion(?: de)?|direccion de)\s+(.+)/);
  if(m && m[1]){ let dest=limpiarDestino(m[1]); if(dest.length<2){ h('¿A qué lugar te llevo?'); return; } cv('trips'); const qd=document.getElementById('quick-dest'); if(qd) qd.value=dest; h("Perfecto, busco la ruta a "+dest+" y te la marco en el mapa."); startQuickTrip(); return; }
  if(/\binicio\b|panel|principal|tablero|\bhome\b/.test(t)){ cv('dash'); abrirEsfera(); h("Vamos al inicio."); return; }
  // Sin anclar (antes eran ^...$ exactos): "muéstrame el mapa", "ábreme mis rutas",
  // "quiero ver mis viajes" no calzaban con el patrón exacto y cualquiera de esas
  // frases tan naturales de pedir esto caían en el mismo bug que pendiente/bajada —
  // intentaba armar un viaje real a un destino llamado literalmente "muestrame el
  // mapa". Igual que chat/taller/stats ya funcionan (más abajo, sin anclar), buscar
  // la palabra clave en cualquier parte de la frase es más robusto y consistente.
  // "dónde estoy/ando/me encuentro" son formas naturales de pedir el mapa con tu
  // ubicación — antes ninguna calzaba con nada y terminaban armando un viaje falso
  // a "donde estoy" (mismo bug que toda esta función).
  if(/\bmapa\b|d[oó]nde (estoy|ando|me encuentro)|mi ubicaci[oó]n/.test(t)){ cv('map'); h("Aquí está el mapa."); return; }
  if(/\brutas?\b/.test(t)){ cv('trips'); h("Tus rutas."); return; }
  if(/\bviajes?\b|navegaci[oó]n/.test(t)){ cv('trips'); h("Tus viajes."); return; }
  if(/chat|social|mensaje/.test(t)){ cv('chat'); h("Abriendo el chat."); return; }
  // "amistad" (solicitudes de amistad) no comparte raíz con "amigo" como texto —
  // antes se perdía en el mismo bug de destino falso.
  if(/amigo|amistad/.test(t)){ cv('chat'); showAmigosYSolicitudes(); return; }
  // "Busca ciclistas cerca": antes solo abría el mapa sin decir nada útil — ahora
  // activa el radar de verdad y contesta con nombre y distancia real, no solo
  // "aquí está el mapa" (que dejaba al usuario mirando la pantalla para
  // averiguarlo él mismo, justo lo que "manos libres" no debería exigir).
  if(/ciclistas?( cerca| en el mapa)?$|busca ciclistas|d[oó]nde hay ciclistas/.test(t)){ _pisteroCiclistasCerca(); return; }
  // "Algún panorama por aquí": datos reales de la comunidad (miradores, picadas,
  // alojamiento) cerca de tu posición — antes esto no existía como pregunta de
  // voz, solo se podía ver mirando el mapa.
  if(/panorama|qu[eé] hacer (por aqu[ií]|por ac[aá]|cerca|por esta zona)|algo (que ver|para ver) cerca|picada cerca|hay algo (interesante|entretenido) (por aqu[ií]|cerca)/.test(t)){ _pisteroPanoramaCerca(); return; }
  // "Cuéntame otra historia/mito/leyenda de este lugar" / "cómo se llamaba antes
  // este lugar": versión PEDIDA de la anécdota de Wikipedia que ya sonaba sola al
  // entrar a una zona nueva — "otra" trae una distinta (mismo registro de ya
  // contadas), y sin el freno de "una vez por zona" porque acá lo pediste tú.
  if(/(cu[eé]ntame|dime|sabes)(me)? (una |otra |alg[uú]n |alguna )?(historia|dato|algo|mito|leyenda)( de este lugar| de por aqu[ií]| del lugar| de ac[aá])?|hay (alg[uú]n |alguna )?(mito|leyenda) (de este lugar|por aqu[ií]|de por ac[aá])|c[oó]mo se llamaba (antes )?este lugar|nombre antiguo de este lugar|otra historia/.test(t)){ _pisteroHistoriaLugar(/mito|leyenda/.test(t)); return; }
  /* 2026-07-20 — Inty reportó "arréglame la bici no va" y tenía toda la razón. El patrón
     pedía el INFINITIVO exacto ("arreglar"), así que las formas naturales de pedirlo
     fallaban todas: "arréglame la bici", "arregla mi bici", "tengo un pinchazo", "se me
     soltó la cadena". Solo funcionaba diciendo "taller" o "necesito arreglar la bici".
     Ahora se busca la RAÍZ (arregl/repar/compon) y los síntomas concretos, que es como
     habla alguien parado al lado de su bici en la ruta. Cubierto por tests/taller.test.mjs. */
  if(/taller|arregl|repar|compone|mecanic|pinch|ponch|se me (solt|corto|rompi|salio|corri)|cadena[^.]{0,14}(rota|salida|suelta|cortada)|(rueda|neumatico|llanta|camara)[^.]{0,14}(pinch|desinfl|rota)|freno (no|suelto|malo)|bicicleta rota|no funciona mi bici|se me quedo la bici/.test(t)){ cv('mac'); h("El taller MacGyver. Cuéntame qué le pasó y te busco el truco."); return; }
  if(/gu[ií]a|hospedaje|hostal|hostel|alojamiento|d[oó]nde.{0,15}(dormir|acampar)|\bacampar\b|camping/.test(t)){ cv('gui'); h("La CicloGuía."); return; }
  if(/estadistica|grafico|progreso|mi avance|mi rendimiento|como voy/.test(t)){ cv('stats'); h("Tus estadísticas."); return; }
  // "ojos"/"piel"/"labios" sueltos quedan afuera a propósito: un ciclista real los
  // usa tambien para quejarse ("me duelen los ojos", "se me quemo la piel") — solo
  // cuentan si van con una frase que de verdad pide cambiarlos.
  if(/personaliz|perfil|casco|personaje|mi avatar|peinado|\bbarba\b|\bbigote\b|vello facial|pa[ñn]oleta|pa[ñn]uelo|tono de piel|color de (ojos|labios|piel)|(cambia|cambiar|cambiame|c[aá]mbiame)\s+(el|los|mis?)\s+(ojos|labios|pelo)/.test(t)){ cv('customize'); h("Personaliza tu personaje."); return; }
  if(/\bg\.?\s?p\.?\s?s\b|grabar|gepe ese/.test(t)){ toggleGPS(); return; }
  // Antes "cuanto" solo (sin nada más) disparaba esto — se comía CUALQUIER
  // pregunta con "cuánto" (cuánto me falta, cuánto se demora, cuánto cuesta...),
  // dando la respuesta de kilómetros totales sin que tuviera nada que ver.
  // Ahora exige que la pregunta sea realmente sobre distancia/kilómetros.
  if(/cuant[oa]s? (kil[oó]metros?|km)|kil[oó]metro|distancia (recorrida|llevo|voy)|que distancia/.test(t)){ h("Llevas "+us.di.toFixed(1)+" kilómetros y "+Math.round(us.c)+" calorías quemadas."); return; }
  // Anclado (^...$) a propósito: "pendiente"/"subida"/"bajada" sueltas o en frases
  // cortas de consulta son sobre el terreno, NO un nombre de lugar — sin este anclaje
  // cualquiera de estas palabras caía en el comando genérico de "arma un viaje a
  // <lo que dijiste>" de más abajo e intentaba navegar a un destino inexistente
  // llamado literalmente "bajada". Anclado también evita chocar con lugares reales
  // que SÍ llevan estas palabras (ej. "Cuesta Barriga" sigue funcionando como destino
  // porque no calza con este patrón).
  if(/^(que |cual es la |como (esta|va) la |hay (una |un )?|vamos en |estamos en )?(pendiente|subida|bajada)(\s+(tiene|hay|ahora|aqui|ahi|esta ruta|esto))?\??\.?$/.test(t)){ h(_pendienteActualTexto()); return; }
  if(/pausa la m[uú]sica|para la m[uú]sica|detén la m[uú]sica|apaga la m[uú]sica/.test(t)){ lpMusic.pause(); h("Música pausada."); return; }
  if(/pon m[uú]sica|reproduce m[uú]sica|dale m[uú]sica|m[uú]sica por favor|^m[uú]sica$/.test(t)){ lpMusic.play(); h("¡Que suene!"); return; }
  if(/cambia la (m[uú]sica|radio|canci[oó]n)|siguiente (canci[oó]n|radio)|otra (canci[oó]n|radio)/.test(t)){ lpMusic.next(); h("Cambiando."); return; }
  if(/activa la voz|enciende la voz|\bhabla\b|vuelve a hablar|quiero que hables|activa el audio/.test(t)){ vozActiva=true; localStorage.setItem('lp_voz','on'); const b=document.getElementById('vozBtn'); if(b) b.innerHTML='<i class="fas fa-volume-high"></i> Voz: ON'; h("Voz activada."); return; }
  // "ayuda" SOLA (anclada, sin nada más) sigue siendo un grito de auxilio real, pero el
  // chequeo de SOS en sí se movió mucho más arriba en esta cadena (ver el comentario junto
  // al clima) para que no lo interceptara el reporte comunitario de "accidente" primero.
  // Acá solo queda distinguir "ayuda" (ya cubierta arriba) del resto de usos de la palabra
  // ("no entiendo esto", "cómo funciona") que sí deben abrir el tutorial, no el SOS.
  if(/tutorial|ayuda|como funciona|no entiendo (la app|esto)/.test(t)){ startTutorial(); return; }
  // Pregunta u orden libre que ningún comando rápido reconoció → la responde la IA
  // avanzada de Pistero (antes esto se convertía en un destino por error: decir
  // "cuánta agua llevo que tomar" armaba un viaje a "agua llevo que tomar").
  // Orden o pregunta libre que ningún comando rápido reconoció → la IA de Pistero, que
  // OBEDECE (navegar, abrir secciones, etc.) o RESPONDE cualquier cosa. Una frase larga
  // casi nunca es un nombre de lugar: va a la IA en vez de forzarla como destino.
  const destino=limpiarDestino(raw);
  // "hola"/"gracias"/"como estas"/"chao"/"adios" NO van acá: ahora tienen respuesta
  // real en FAQ_CHARLA (más arriba en la cadena, así que nunca deberían llegar hasta
  // este punto) — antes se trataban como ruido a descartar, sin ninguna respuesta,
  // que es justo el reporte real de Inty ("le pregunté cómo estaba y se quedó callado").
  const stop=/^(ok|oye|ya|listo|si|no|que|prueba|test|esfera|menu)\.?$/i;
  const esOrdenOPregunta = /^(que|como|cuando|cuanto|cuanta|cuantos|por que|cual|quien|para que|puedes|podrias|sabes|dime|cuentame|explicame|hablame|recomiendame|me recomiendas|busca|buscame|investiga|averigua|ayudame|necesito|quiero|abre|abrir|muestra|pon|dale)\b/.test(t) || /\?\s*$/.test(raw) || destino.split(/\s+/).filter(Boolean).length>=5;
  if(esOrdenOPregunta){
    if(destino.length<2 || stop.test(normalizar(destino))){ _vozNoEntendi(); return; }
    abrirPistero();
    const pi=document.getElementById('pisteroInput');
    if(pi){ pi.value=raw; preguntarPistero(); }
    return;
  }
  // Pocas palabras y parece un lugar → armamos el viaje directo (camino rápido).
  if(destino.length>2 && !stop.test(normalizar(destino))){ cv('trips'); const qd=document.getElementById('quick-dest'); if(qd) qd.value=destino; h("Perfecto, armo el viaje a "+destino+" y te marco la ruta."); startQuickTrip(); return; }
  // No se entendió la petición → recomendar escribirla, con una broma sutil.
  _vozNoEntendi();
}
function _vozNoEntendi(){
  const bromas=[
    'No te cacho bien con el viento en la oreja 😅. Escríbeme aquí abajo y lo hacemos al tiro.',
    'Esa se me perdió en la bajada 🚵. Tíramela por escrito y la pillo de una.',
    'Ni con audífonos nuevos te entendí esa 😆. Escríbela en el cuadro de texto y lo resolvemos.',
    'Se me cruzaron los cables 🤖. Mejor escríbelo y te obedezco al toque.'
  ];
  h(bromas[Math.floor(Math.random()*bromas.length)]);
}

const tutorialSteps=[
  {d:'¡Hola! Soy Pistero. Sube el volumen y te muestro la app en un minuto.'},
  {sel:'#btnEsferaHeader', d:'Tu Esfera: los accesos flotando. Gírala y toca un ícono. Este botón la reabre.'},
  {view:'dash', sel:'#quick-dest', d:'Escribe o dicta un destino del mundo y te guío paso a paso, aquí mismo en Inicio.'},
  {sel:'#micBtn', d:'O toca el micrófono y dime un destino de viva voz: te guío como Waze.'},
  {view:'pistero', sel:'#pisteroInput', d:'Este es mi chat. Escríbeme aquí cualquier pregunta —rutas, arreglos de bici, dónde alojar— y te respondo. Vivo en este botón de abajo, en cualquier pantalla.'},
  {view:'dash', sel:'.speed-display', d:'Tu velocidad en vivo. El GPS graba tu ruta solo: se guarda al detenerte, no prendas nada.'},
  {view:'dash', sel:'button[onclick="enviarSOS()"]', d:'SOS: guarda tus contactos y les mando tu ubicación por WhatsApp al toque.'},
  {view:'customize', sel:'.darma-badge', d:'Tu Darma: premio por aportar. Desbloquea cascos, skins y estilos.'},
  {sel:'#btnEsferaHeader', d:'Logros, Ranking y Tienda viven en tu Esfera: gírala y toca "Logros" para ver tu avance y el Top 100 por kilómetros.'},
  {view:'musica', sel:'#lpPlayer', d:'Música: radios gratis o tu propia carpeta. Baja sola cuando hablo y sube cuando termino.'},
  {view:'ajustes', sel:'#vozBtn', d:'En Ajustes controlas la voz de Pistero, el ahorro de pantalla y de GPS.'},
  {view:'map', sel:'#btnCapaMapa', d:'Tu mapa, más limpio: calles o topográfico con un toque, y tu ruta se marca en dorado a medida que avanzas.'},
  {view:'map', sel:'#fabReportar', d:'Reporta a la comunidad: peligros, picadas o miradores. Ganas Darma.'},
  {view:'map', sel:'button[onclick="toggleRadarOnMap()"]', d:'Ciclistas: mira a otros pedaleros en el mapa, cada uno con su casco.'},
  {view:'chat', sel:'#v-chat .quick-links', d:'Social: tus amigos, solicitudes y chats privados.'},
  {view:'mac', sel:'#v-mac .section-info', d:'Taller MacGyver: trucos para reparar tu bici en plena ruta.'},
  {view:'customize', sel:'#estilosGrid', d:'En Perfil armas tu personaje y eliges el estilo de la esfera. ¡A rodar!'}
];
let tutorialIdx=0;
function tutSetPanel(el,x,y,w,h2){ el.style.left=x+'px'; el.style.top=y+'px'; el.style.width=Math.max(0,w)+'px'; el.style.height=Math.max(0,h2)+'px'; el.style.display='block'; }
function tutSpotlight(el){
  const T=document.getElementById('tutDimT'),B=document.getElementById('tutDimB'),L=document.getElementById('tutDimL'),R=document.getElementById('tutDimR'),ring=document.getElementById('tutRing');
  if(!el){ tutSetPanel(T,0,0,window.innerWidth,window.innerHeight); [B,L,R].forEach(function(p){p.style.display='none';}); ring.style.display='none'; return; }
  const r=el.getBoundingClientRect(), pad=8;
  const x=Math.max(0,r.left-pad), y=Math.max(0,r.top-pad), w=r.width+pad*2, h2=r.height+pad*2;
  tutSetPanel(T,0,0,window.innerWidth,y);
  tutSetPanel(B,0,y+h2,window.innerWidth,window.innerHeight-(y+h2));
  tutSetPanel(L,0,y,x,h2);
  tutSetPanel(R,x+w,y,window.innerWidth-(x+w),h2);
  ring.style.display='block'; ring.style.left=x+'px'; ring.style.top=y+'px'; ring.style.width=w+'px'; ring.style.height=h2+'px';
}
function startTutorial(){
  tutorialIdx=0;
  document.getElementById('tutorialOverlay').classList.add('on');
  const banner=document.getElementById('tutBanner');
  if(banner){ banner.classList.remove('hide'); clearTimeout(banner._hideTO); banner._hideTO=setTimeout(function(){ banner.classList.add('hide'); },4500); }
  renderTutorial();
}
// Pistero "te enseña": salta directo a UN paso del tutorial (índice de tutorialSteps)
// en vez de recorrerlo entero desde el principio — reutiliza el mismo spotlight
// gráfico real sobre el botón/pantalla exacto, no una descripción en texto suelto.
const TUTORIAL_TEMAS={
  esfera:1, sos:6, emergencia:6, auxilio:6,
  destino:2, buscar:2, navegar:2, ruta:2, viaje:2,
  microfono:3, mic:3,
  pistero:4, ia:4, preguntar:4,
  velocidad:5, gps:5, grabar:5, ritmo:5,
  darma:7, puntos:7, monedas:7,
  logros:8, ranking:8, tienda:8, top:8, posicion:8, puesto:8,
  musica:9, radio:9, canciones:9,
  ajustes:10, voz:10, bateria:10,
  mapa:11, capas:11, satelite:11, topografico:11,
  reportar:12, peligro:12, reporte:12,
  ciclistas:13, radar:13,
  social:14, amigos:14, mensajes:14, chat:14, solicitudes:14,
  taller:15, reparar:15, bici:15, mecanica:15,
  perfil:16, personaje:16, casco:16, personalizar:16
};
function mostrarPasoTutorial(indice){
  if(indice==null || !tutorialSteps[indice]) return;
  tutorialIdx=indice;
  document.getElementById('tutorialOverlay').classList.add('on');
  const banner=document.getElementById('tutBanner');
  if(banner){ banner.classList.remove('hide'); clearTimeout(banner._hideTO); banner._hideTO=setTimeout(function(){ banner.classList.add('hide'); },4500); }
  renderTutorial();
}
function renderTutorial(){
  const s=tutorialSteps[tutorialIdx];
  document.getElementById('tutProgress').innerText=(tutorialIdx+1)+' / '+tutorialSteps.length;
  document.getElementById('tutPrev').style.visibility=tutorialIdx===0?'hidden':'visible';
  document.getElementById('tutNext').innerText=tutorialIdx===tutorialSteps.length-1?'¡A pedalear!':'Siguiente ▶';
  // El paso de Pistero necesita abrirPistero() (no solo cv()): así deja el chat
  // inicializado con su saludo real, no la sección en blanco sin historial.
  if(s.view==='pistero') abrirPistero(); else if(s.view) cv(s.view);
  pararVoz(); // corta la narración anterior al toque, sin esperar (nunca se encima con la del paso nuevo)
  // pequeño retardo para que la vista cambie y el elemento exista/posicione
  setTimeout(function(){
    const el=s.sel?document.querySelector(s.sel):null;
    // scroll INSTANTÁNEO (sin 'smooth'): en celulares reales la animación suave
    // seguía en movimiento cuando medíamos la posición, y el brillo quedaba
    // desfasado sobre otro botón. Esperamos dos frames de pintado reales
    // (no un tiempo fijo adivinado) para que el layout ya esté asentado.
    if(el) el.scrollIntoView({block:'center'});
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ tutSpotlight(el); h(s.d); }); });
  }, s.view?260:0);
}
function tutNext(){ if(tutorialIdx<tutorialSteps.length-1){ tutorialIdx++; renderTutorial(); } else { closeTutorial(); } }
function tutPrev(){ if(tutorialIdx>0){ tutorialIdx--; renderTutorial(); } }
function closeTutorial(){ document.getElementById('tutorialOverlay').classList.remove('on'); if(cu) localStorage.setItem('lp_tut_'+cu,'done'); hCorta("¡Listo! Ya conoces lo básico. Cualquier duda, tócame el micrófono. ¡A rodar!"); _esperarFinVoz(function(){ if(typeof abrirEsfera==='function') abrirEsfera(); }); }
