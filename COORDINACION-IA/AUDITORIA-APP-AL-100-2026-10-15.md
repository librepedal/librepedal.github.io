# Auditoría "app al 100, sin datos falsos" — 2026-10-15

Pedido de Inty: *"he pedido que todo funcione bien sin dar datos falsos… hay que buscar qué problemas se pueden generar y corregirlos… quiero perfección y siempre me encuentro con algo nuevo"*.

Método: buscar en el código **cada número que la app muestra o dice** y **cada función que en la app instalada no funciona**, comprobar la causa con datos reales o simulados, corregir de raíz, y dejar un test que falle si el error vuelve (`tests/datos-reales.test.mjs`, `tests/km-viaje.test.mjs`).

## Corregido (con test)

| # | Qué estaba mal | Causa | Arreglo | Rama |
|---|---|---|---|---|
| 1 | Km perdidos: Río Claro → Parque Inglés 0,27 km en 136 min | El contador exigía "ventana de velocidad" de 12 s y ≥6 km/h; con posiciones cada 15-30 s (pantalla apagada, bolsillo, cordillera) o lento daba 0 | Contador por distancia real (`km-viaje.js`), sin temblor estando quieto | `fix/km-perdidos` |
| 2 | Rutas grabadas con km de la cuenta, no de la ruta | `distance:us.di` | Km del propio trazado; rutas viejas se corrigen al abrirlas | `fix/km-perdidos` |
| 3 | Hora de llegada de auto para ciclistas y caminantes; rutas por carretera de autos | `router.project-osrm.org` ignora el perfil (probado: mismo tiempo en bici/pie/auto) | Servidores FOSSGIS con perfil real (`urlRuteo`) | `fix/app-al-100` |
| 4 | Hora de llegada fija desde la partida | Se calculaba una vez | Se recalcula con lo que falta y tu velocidad real | `fix/app-al-100` |
| 5 | Calorías km × 30 para todo; manejando sumaba calorías | Constante fija | `kcalPorKm()` por actividad; vehículo 0 | `fix/app-al-100` |
| 6 | Navegar en auto gastaba la cadena de la bici | La navegación no usaba `_sumarKmViaje` | Unificado | `fix/app-al-100` |
| 7 | "Vel. media" = lecturas de la sesión con paradas en 0, se perdía al cerrar; a Pistero se le decía "histórica" | Promedio de `speedReadings` | Media histórica en movimiento (`velMediaHistorica`) | `fix/app-al-100` |
| 8 | "Vas más rápido que tu promedio" falso | Suma solo al navegar, dividida por todos los km (incluido auto) | Suma y km juntos, también al grabar, sin auto | `fix/app-al-100` |
| 9 | Logros de km (y "elegible a premios") contaban km en auto | `us.di` | `kmAPulso()` | `fix/app-al-100` |
| 10 | CO₂ "evitado" manejando | `us.di` | `kmAPulso()` | `fix/app-al-100` |
| 11 | Vel. máxima solo de la sesión y con el auto | `maxSpeed` | `us.vmax` a pulso | `fix/app-al-100` |
| 12 | En la app NO funcionaba ningún compartir (video, imagen, resumen del año, viaje, perfil, seguir en vivo, **SOS**) y se mandaba a Chrome | El WebView de Android no trae `navigator.share` | `compartir-nativo.js` + plugins `@capacitor/share` y `@capacitor/filesystem` | `fix/app-al-100` |
| 13 | Mensajes "abre librepedal.cl en Chrome" | Ídem | Ninguno queda; en app vieja se pide actualizar | `fix/app-al-100` |
| 14 | Pistero repetía frases (agua cada 20 min, tips cada 11, travieso) | Generadores sin tope | Máx. 3 de charla por viaje | `fix/pistero-menos-frases` |
| 15 | Giros perdidos con señal débil | Voz en vivo colgada 12 s | Voz del teléfono a los 2 s | `fix/giros-sin-senal` |

## Segunda pasada (corregido, con test en `tests/datos-reales.test.mjs`)

| # | Qué estaba mal | Arreglo |
|---|---|---|
| 16 | Retos y "Mi año" sumaban GPX importados (se cumplía un reto importando un archivo) y viajes en auto | `rutaCuentaComoRecorrida()`; las rutas guardan `modo` |
| 17 | Contador de viajes incluía rutas importadas | Ídem |
| 18 | Darma de aportes sin límite (farmeable para sorteos/premios); mensajes prometían "quince de Darma" siempre | Tope de 5 aportes/día; el mensaje dice lo ganado de verdad |
| 19 | Segmentos: con posiciones cada 25 s no se armaban o cerraban tarde | Paso por el tramo entre posiciones, hora interpolada |
| 20 | Segmentos de ida y vuelta: récord de 0 s | Hay que alejarse 150 m antes de cerrar |
| 21 | Segmentos: tiempos en auto en la tabla de ciclistas; marcas imposibles | No se arma en vehículo; >90 km/h en línea recta se descarta |
| 22 | Segmentos sin señal: "primera vez"/"récord" + Darma falsos (caché vacía) | Solo se afirma si el dato viene del servidor |
| 23 | Resumen de viaje: "km/h prom." con las paradas | Velocidad en movimiento, rotulada así |
| 24 | Auto-pausa pausaba el reloj mientras pedaleabas (posiciones espaciadas) | Pausa solo si los km no avanzan en 1 min |
| 25 | Desnivel: una cuesta gradual marcaba ~0 m | Acumulación con umbral de 3 m; perfiles viejos se recalculan |
| 26 | Reportes: "a unos metros" a 600 m; chiste "control a tres kilómetros" a 500 m | Distancia real dicha |
| 27 | SOS sin señal: la app quedaba muda | Responde a los 8 s y recuerda el 133 |
| 28 | Aviso por voz, aviso de rodada y tiempo de segmento mudos sin señal | Responden de inmediato y dicen la verdad |
| 29 | 17 errores mostrados en inglés técnico ("Missing or insufficient permissions") | `lpErrorHumano()`: qué pasó y qué hacer |

## Probar en el teléfono (no se puede comprobar desde el computador)

- Botones 133/131/132 y "Enviar por WhatsApp" del SOS dentro de la app instalada.
- Compartir (video, imagen, GPX, resumen del año) con la versión nueva de Play.
- Km y segmentos con la pantalla apagada en un trayecto conocido.

## Requiere acción de Inty

- **Nueva versión en Play Store** para que la app instalada tenga los plugins de compartir/archivos (#12). Sin eso, la app vieja muestra "actualiza la app".
- **Publicar reglas de Firebase** (radio, avisos, rutas recomendadas): `Documentos\LibrePedal-reglas-para-publicar`.
- **Servidor de rutas**: FOSSGIS es gratis con uso justo (sin cuota fija). Si la app crece mucho, conviene un servidor propio.

## Revisado sin problemas

- Ciclistas del mapa: no hay datos inventados (solo usuarios reales).
- Ranking: ya separa km por modo (`kmPorModo`).

## Por revisar en la próxima pasada

- Guardados que esperan al servidor en pantallas de casa (perfil, votación, sorteo, solicitud de amistad): con mala señal quedan sin respuesta. Mismo arreglo que #28.
- Avisos de reportes en ruta: hoy por distancia en línea recta; en navegación conviene solo los que están sobre la ruta.
- Inicio de sesión de punta a punta en la app instalada (correo, Google, código del evento): requiere el teléfono.
