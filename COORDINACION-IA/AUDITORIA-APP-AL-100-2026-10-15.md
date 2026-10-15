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

## Requiere acción de Inty

- **Nueva versión en Play Store** para que la app instalada tenga los plugins de compartir/archivos (#12). Sin eso, la app vieja muestra "actualiza la app".
- **Publicar reglas de Firebase** (radio, avisos, rutas recomendadas): `Documentos\LibrePedal-reglas-para-publicar`.
- **Servidor de rutas**: FOSSGIS es gratis con uso justo (sin cuota fija). Si la app crece mucho, conviene un servidor propio.

## Revisado sin problemas

- Ciclistas del mapa: no hay datos inventados (solo usuarios reales).
- Ranking: ya separa km por modo (`kmPorModo`).

## Por revisar en la próxima pasada (no revisado aún)

- Retos y Darma: qué km cuentan y si se pueden duplicar.
- Segmentos: tiempos con posiciones espaciadas (mismo problema que #1).
- Resumen de viaje y "Wrapped" del año: origen de cada número.
- Desnivel/subida mostrada en rutas.
- Avisos de reportes: vigencia y distancia.
- SOS y seguir en vivo: flujo completo en la app (con #12 ya comparten).
- Inicio de sesión (correo, Google, código) en la app instalada.
- Funcionamiento sin señal de cada pantalla.
