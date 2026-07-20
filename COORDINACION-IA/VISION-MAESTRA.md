# 🧭 Visión maestra — Libre Pedal

Documento de referencia para AMBAS IAs (Claude y Gemini). Escrito por Inty
(2026-07-11) como el "prompt maestro" del proyecto: la app de cicloturismo con IA
más avanzada del mundo, un compañero de viaje, no un GPS que lee instrucciones.

**Regla de oro**: nada de lo que ya funciona se rompe para construir esto. Cada
módulo nuevo se agrega sin tocar lo que ya está probado, siguiendo el protocolo de
`LEEME.md` (versión sincronizada, verificar antes de desplegar, anotar en `BITACORA.md`).

---

## Estado real por módulo (auditado 2026-07-11, v6.01)

Leyenda: ✅ existe y funciona · 🔶 existe parcial/básico · ⬜ no existe todavía

| Módulo del prompt maestro | Estado | Qué hay hoy | Qué falta para el nivel del prompt maestro |
|---|---|---|---|
| **Copiloto Inteligente** | ✅ | Chat "Pregúntale a Pistero" (v5.91+), responde por texto/voz, obedece órdenes (`[ACCION:...]`), busca en Wikipedia y clima real (v5.96) | Anticiparse proactivamente sin que se lo pidan (hoy solo responde, no inicia) |
| **Memoria** | 🔶 | `pisteroHistorial` (últimos 16 mensajes, localStorage) + `_pisteroContexto()`: últimas 4 rutas nombradas, vel. media, viajes completados, hora | No guarda preferencias explícitas (comida favorita, terreno preferido, presupuesto habitual, descansos típicos) como perfil persistente y creciente |
| **Planificador** | ✅ | Viajes multi-destino, calculadora de gastos con km reales (OSRM), hospedajes de la comunidad | Integrar clima/dificultad/desnivel al plan automáticamente (hoy es manual) |
| **Turismo Inteligente** | 🔶 | Anécdotas reales por Wikipedia geolocalizada durante la ruta (no inventa nada) | Profundidad narrativa sistemática (historia, leyendas, pueblos originarios) — hoy depende de qué haya en Wikipedia del punto exacto |
| **Visión Artificial** | ❌ DESCARTADA | No existe | Inty la descartó explícitamente (2026-07-11): no aplica al proyecto. **No construir esto**, ni siquiera para arreglar bicicletas con la cámara. |
| **Clima Inteligente** | 🔶 | Clima real al pedirlo a Pistero, clima por cada parada del viaje al planificar | No hay monitoreo CONSTANTE con aviso proactivo antes de que aparezca la tormenta |
| **Seguridad** | ✅ | Detección de caídas (golpe + quietud), SOS con WhatsApp, avisos de hidratación por distancia | Deshidratación/calor/frío extremos no se infieren del clima real todavía; "zonas peligrosas" son solo reportes manuales de otros usuarios |
| **Comunidad** | ✅ | Reportes en ruta (peligros, agua, miradores, seguridad), CicloGuía (hospedajes, camping), +4.000 puntos reales de OSM | — |
| **Presupuesto Inteligente** | 🔶 | Calculadora de gastos estimados al planificar | No hay registro continuo de gastos reales del viaje ni alerta de "te estás pasando" |
| **Entrenador Personal** | 🔶 | Frases adaptadas a tu ritmo (lento/normal/rápido), avisos de pendiente/bajada, comparación con tu propio histórico | No hay recomendaciones de entrenamiento explícitas (series, descanso, progresión) |
| **Diario Automático** | 🔶 | Ciclo Bitácora, video 3D estilo Relive (recién arreglado en v6.01), perfil de elevación, resumen anual estilo Wrapped | Falta narración generada por IA y organización automática de fotos |
| **Personalidad** | ✅ (v6.02) | Selector en Perfil: cercano/aventurero/entrenador/relajado/humorístico/guía turístico. Cambia el tono, no la identidad. Default = comportamiento de siempre | Los tonos son sutiles con el modelo actual (Llama 3.3 fp8) — podría afinarse más con prompts más largos por tono si se nota poco distinguible en uso real |
| **Conversación natural** | ✅ | Se puede interrumpir a Pistero ("detente/cállate", v5.85), recuerda los últimos mensajes de la conversación | — |
| **Sin internet** | ✅ | Service worker, mapas de ruta descargables, guardado de rutas local-first (nunca se pierde una ruta grabada sin señal) | — |
| **Gamificación** | ✅ | Darma, logros, niveles, retos con meta de km, segmentos con tabla de líderes | — |
| **Inteligencia Predictiva** | 🔶 (v6.02) | **Lluvia proactiva**: chequea pronóstico horario cada ~20 min en ruta, avisa si vienen 2h con >60% probabilidad ANTES de que llueva. **Cansancio**: compara tu ritmo real de los primeros 15 min vs una ventana móvil de los últimos 15 min, avisa si cae ≥25% tras 40+ min activo | Hambre no se predice (sigue siendo aviso a distancia fija); sin sensor de pulso no hay señal fisiológica real, solo velocidad como proxy |
| **Escalabilidad a otros deportes** | ✅ (v6.02, base real) | Selector de actividad en Perfil (Ciclismo/MTB/Trekking/Moto-Auto) cambia el **perfil real de ruteo OSRM** (cycling/foot/driving, verificado en vivo) y el lenguaje de Pistero (sin mencionar bicicleta si no aplica) | Trekking/Moto son modos base — falta pulir detalles propios de cada uno (ej. puntos de interés específicos de trekking, gasolineras para moto). Visión Artificial descartada explícitamente por Inty, no se construye |

---

---

# 🧭 DOCTRINA 1 — La app se adapta al modo de viaje

*(definida con Inty el 2026-07-20; manda por sobre cualquier decisión de interfaz)*

## El principio

No se trata de "esconder botones". Cada disciplina **le hace a la app una pregunta
distinta**, y la pantalla debe responder ESA pregunta:

| Quién | Su pregunta | Qué manda en pantalla |
|---|---|---|
| 🏁 Rutero (liviano) | *¿Cómo voy?* | Ritmo, cadencia, potencia, ahora |
| 🎒 Cicloviajero (cargado) | *¿Qué viene?* | Agua, pueblo, cuesta, luz que queda |
| 🚵 MTB / Gravel | *¿Qué me espera abajo?* | Terreno, desnivel, técnica |
| 🥾 Trekking | *¿Alcanzo?* | Luz restante contra distancia restante |
| 🚗 Vehículo | *¿Dónde están?* | **Es un ROL, no una disciplina** (ver abajo) |

## Núcleo común — nunca se esconde

Navegar y mapa · voz de Pistero · SOS y contactos · detección de caídas · reportar
peligros · distancia y tiempo · descargar mapa offline · perfil · ajustes.

## Reparto por modo

**🏁 Rutero** — MUESTRA: sensores Bluetooth (pulso/potencia), vueltas, segmentos y tabla
de líderes, ranking, logros, retos, exportar GPX, gráficos de desempeño.
ESCONDE: hospedajes/CicloGuía, presupuesto, planificador multi-destino, "te doy alojo",
Taller MacGyver. *(Sale 3 horas y vuelve a su casa.)*

**🎒 Cicloviajero** — MUESTRA: planificador multi-destino, presupuesto y gastos,
CicloGuía y "te doy alojo", Ciclo Bitácora, puntos útiles (agua/comida), clima, Taller
MacGyver, descarga de mapa EN PRIMER PLANO.
ESCONDE: segmentos y tabla de líderes, potenciómetro, vueltas. *(A quien lleva 5 días
en ruta no le importa su récord en una subida.)*

**🚵 MTB / Gravel** — MUESTRA: perfil de elevación, segmentos de bajada, vueltas,
miradores, umbral de caídas propio. ESCONDE: presupuesto, hospedajes, potenciómetro.

**🥾 Trekking** — MUESTRA: elevación, luz que queda, puntos de agua, bitácora, SOS
reforzado. ESCONDE: todo lo de bicicleta (cadencia, vueltas, segmentos, sensores, taller).

**🚗 Vehículo** — El más pelado. MUESTRA: mapa, ciclistas en vivo, reportar, navegar.
ESCONDE: calorías, vueltas, cadencia, Darma, logros **y detección de caídas** (en un auto
no significa nada). Su valor real es **auto de apoyo**: ver a los ciclistas del grupo,
quién quedó atrás, quién necesita agua. Eso no lo tiene nadie en el rubro y es
directamente aplicable a la cicletada de Lago Ranco (octubre 2026).

## Las dos reglas que lo hacen seguro

1. **Esconder NO es borrar.** Todo lo oculto vive en un solo lugar —**"Más"**— siempre
   en el mismo sitio. Nadie pierde una función que ya conocía. Las interfaces
   adaptativas fracasan cuando las cosas aparecen y desaparecen: el usuario deja de
   confiar. **El modo cambia qué está PROMINENTE, nunca qué EXISTE.**
2. **El modo se cambia en pleno viaje.** Si pasas de pedalear a caminar, la app te sigue.

## Mismo dato, distinta lectura

Las funciones comunes NO se copian iguales: se **parametrizan**. Caso de referencia, los
avisos de pendiente (ya implementado en v7.05):

| Modo | Umbral | Anticipación | Cómo lo dice |
|---|---|---|---|
| Rutero | 3-4% | ~180 m | Corto y seco, o nada: le rompe el ritmo |
| Cicloviajero | 3% | ~180 m | *"cuesta larga, baja un cambio y dosifica"* — le importa el esfuerzo |
| MTB | 5% | ~180 m | Terreno y técnica |
| Trekking | 8% | ~180 m | *"subida de 20 minutos"* — el tiempo le dice más que los metros |
| Vehículo | 12% | ~583 m | *"curva y bajada en 500 metros"* — le importa el riesgo |

**Regla general:** una función común se adapta en tres ejes — **umbral, anticipación y
redacción**. Nunca se muestra el mismo texto a dos modos distintos.

## Rankings separados por modo

**Esto no es una mejora: arregla un problema en producción.** Hoy `mostrarRanking()` hace
`orderBy('km','desc')` sobre un único campo `km`, **sin filtrar por modo**, bajo el título
"Los cicloviajeros con más kilómetros del mundo". Los kilómetros hechos en auto entran al
mismo ranking que los pedaleados: un viaje de 300 km manejando le gana a casi cualquier
ciclista real. Frente a la élite del ciclismo chileno eso destruye la credibilidad del
ranking completo. El dato del modo YA se guarda (`actividad` en el perfil); falta
acumular kilómetros **por modo** y rankear por separado.

Cada modo compite en **lo que de verdad importa en esa disciplina**:

| Modo | Qué se rankea |
|---|---|
| 🏁 Rutero | Kilómetros y velocidad media |
| 🎒 Cicloviajero | Kilómetros y **días en ruta** |
| 🚵 MTB | **Desnivel acumulado** (subir, no la distancia) |
| 🥾 Trekking | Desnivel y horas caminadas |
| 🚗 Vehículo | **Ninguno.** No compite: es apoyo |

---

# 🎙️ DOCTRINA 2 — Pistero sorprende sin invadir

*(definida con Inty el 2026-07-20)*

Inty lo llamó **la llave maestra**: que Pistero sea indescifrable, nunca monótono ni
predecible, y que se sienta **fraternal, de amigo**.

## La verdad incómoda sobre lo impredecible

**No se consigue con más frases.** Cualquier catálogo finito se vuelve predecible: las
~1.300 frases actuales parecen infinitas el primer día y son repetitivas al tercer mes
para quien pedalea a diario. Es matemática, no calidad.

> **Lo impredecible no está en QUÉ dice, está en CUÁNDO habla.**

Si Pistero habla cada 10 minutos es predecible aunque tenga diez mil frases, porque sabes
que viene. Si calla 40 minutos y habla justo cuando te estás muriendo en una subida, eso
no se olvida. **El silencio es lo que le da valor a la voz.**

## Lo verdaderamente infinito: combinar con datos reales

Las frases armadas con datos del usuario **no se repiten nunca, porque los datos no se
repiten**: *"esta subida la hiciste 40 segundos más rápido que en marzo"*, *"vas por el
kilómetro mil de tu vida en Libre Pedal"*, *"hoy hace un año pasaste por acá, con
lluvia"*. **El catálogo fijo es el piso, no el motor.** Strava tiene esos datos y nunca
los dice: ahí está la diferencia, y no la copia una app grande sin volverse otra cosa.

## Memoria de lo ya contado

`obtenerFraseUnica()` ya lleva la cuenta de lo dicho, **pero `frasesUsadas` vive en
memoria**: al cerrar la app Pistero vuelve a creer que nunca contó nada. Por eso se
escucha repetido. Debe persistir en el teléfono y en la cuenta.

Y en la línea donde hoy dice `if(disp.length===0){ frasesUsadas[clave]=[]; ... }` — el
código **ya sabe cuándo se le acabaron las anécdotas** y hoy reinicia en silencio. Ese es
exactamente el lugar donde Pistero debe decir: *"ya te conté todo lo que sé de esto, ¿te
las repito o cambiamos de tema?"*. **La función que Inty imaginó no hay que inventarla:
hay que dejar de ocultarla.**

## De dónde salen las sorpresas (todo gratis, todo real)

1. **Historia, mitos y leyendas del lugar** → **Wikipedia GeoSearch** devuelve artículos
   cercanos a una coordenada. Gratis, ilimitado, y **cada lugar es distinto**: fuente
   infinita por construcción. Pistero lo cuenta en chileno, con su voz.
2. **La música que suena** → **NO usar el micrófono.** A 25 km/h oye viento, se come la
   batería, identificar audio es un servicio pago, y una app de ciclismo grabando audio
   continuo es una bandera roja en la revisión de Google Play. El teléfono **ya publica**
   título y artista al sistema (lo que se ve en la pantalla bloqueada): se lee gratis,
   sin micrófono y con el nombre exacto. Requiere un plugin nativo chico.
3. **Los propios datos del usuario** (ver arriba).

**Regla dura sobre los datos: la anécdota se saca de una fuente real (Wikipedia,
MusicBrainz), NUNCA se inventa.** Un dato falso sobre una persona o un lugar real, dicho
con la voz de Pistero como si fuera cierto, es exactamente el tipo de error que después
se cobra caro. Fuente verdadera, voz nuestra.

## Pistero PROPONE, nunca DISPONE

Inty planteó que Pistero pudiera cambiar la canción por una que al usuario le guste y que
no oye hace tiempo. **La intención es correcta; tomar el control no.** Cambiarle la música
a alguien sin permiso es justo lo invasivo que él no quiere — y además técnicamente exige
cuenta premium y permisos del servicio de música.

La forma correcta: **sugerir y que el usuario decida.** *"Oye, ¿te pongo la que te
levanta el ánimo? Hace como tres meses que no la escuchas."* Si dice que sí, se manda la
orden. Misma magia, cero invasión, y sin muro técnico.

Esta regla vale para TODO, no solo la música: **Pistero ofrece, el usuario manda.**

## Conocer al usuario de verdad

Hoy el campo `gustos` es literalmente el casco que eligió. Eso no es conocer a nadie.
Conocerlo es leer **lo que hace**: a qué hora sale, si para mucho, si aprieta en las
subidas, si anda solo o en grupo. Y sobre todo una señal que no mide nadie:

> **Cuándo lo mandan a callar.**

Si cada vez que Pistero suelta una broma el usuario aprieta silencio, esa categoría se
retira sola. **Aprender de ser callado.**

## Reglas anti-invasión (no negociables)

1. **La seguridad manda siempre.** Ninguna sorpresa puede pisar una instrucción de
   navegación ni una alerta de caída (el bus de prioridad de voz ya existe: usarlo).
2. **Nunca en el esfuerzo.** No se cuentan anécdotas en plena subida ni con el pulso alto.
3. **Cupo por viaje**, distinto según el modo: al rutero casi nada, al cicloviajero
   seguido — es el único con horas de soledad para escuchar. **Ahí es donde la app deja
   de ser una herramienta y se vuelve un compañero, y eso no lo tiene ninguna otra.**
4. **El silencio es el estado por defecto**, no el castigo.
5. **Callarlo siempre a un toque**, y que ese toque enseñe (ver arriba).

---

## Cómo se usa este documento

1. **No es una lista de tareas para hacer todas de una vez.** Es el norte del
   producto. Cada sesión (Claude o Gemini) elige UN módulo o mejora concreta,
   la implementa con la misma disciplina de siempre (verificar, no romper nada,
   anotar en `BITACORA.md`), y lo tacha/actualiza acá.
2. Antes de construir algo "desde cero", revisar esta tabla — varias cosas del
   prompt maestro YA existen aunque con otro nombre (ej. "Entrenador Personal"
   ya vive parcialmente en las frases adaptativas y el comparador de ritmo).
3. **Visión Artificial: NO construir.** Inty la descartó explícitamente. No proponerla
   de nuevo salvo que él la pida.
4. (2026-07-11, v6.02) Personalidad, Predicción real (lluvia+cansancio) y
   Escalabilidad a otros deportes → **implementadas**, ver tabla arriba y `BITACORA.md`.
5. Huecos que siguen abiertos: **Memoria más profunda** (perfil persistente de
   preferencias, no solo últimas rutas), **Presupuesto con registro real** (no solo
   estimado), **Diario con narración generada**, **Turismo con profundidad
   sistemática**. Prioridad a decidir con Inty, no asumir.
