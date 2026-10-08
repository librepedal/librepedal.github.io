# Traspaso 2026-10-08 noche — pantalla apagada (8.819) y video del sobrevuelo (8.818)

## Publicado
| Versión | Qué | Rama |
|---|---|---|
| 8.818 | Video del sobrevuelo para redes (MP4 9:16 en Chrome, menú de compartir). En la app instalada, "Compartir mi viaje" y el video avisan "abre librepedal.cl en Chrome" (antes fallaba en silencio: el WebView de Android no tiene `navigator.share`, MDN). `sobrevuelo-3d.js` dividido en `sobrevuelo-video.js`, `sobrevuelo-3d-vista.js`, `sobrevuelo-3d-pegada.js` (gate de 1000 líneas). | `feature/sobrevuelo-video` |
| 8.819 | Pantalla apagada grabando: la ruta ya no se cierra donde se apagó la pantalla; el hueco se rellena por el camino (OSRM) en vez de una recta y esos km se suman (`gps-hueco.js`). | `fix/pantalla-apagada` |

## Causa de raíz (Inty: "no habla con la pantalla apagada", "línea recta", "el sobrevuelo llega hasta donde apago")
En la app instalada, el GPS nativo (foreground service) sigue, pero sus ubicaciones llegan a la página por el puente nuevo
de Capacitor (`addWebMessageListener`, `MessageHandler.java` de @capacitor/android 8.5.2), que se traba en segundo plano.
El README de @capacitor-community/background-geolocation pide `android.useLegacyBridge: true` ("This prevents location
updates halting after 5 minutes in the background", issue #89). **Ya está en `capacitor.config.json`, pero solo llega con
un AAB nuevo en Play Store** (workflow manual `build-aab-release.yml`). Inty recibió la recomendación de no subir nada a
Play Store por ahora: **decisión suya**. Sin eso, la voz con la pantalla apagada NO se puede arreglar desde la web
(Pistero habla cuando llega una ubicación).

## Pendiente
1. AAB con `useLegacyBridge` → Play Store, con OK de Inty; probar en su teléfono con la pantalla apagada 10+ min
   (¿siguen llegando puntos? ¿habla Pistero?). Ojo con la Alpha 8.802 vieja en "Enviar cambios" (TRASPASO-2026-10-08-TARDE).
2. Perfil "al llegar al extremo derecho": NO reproducido a 390×844 (nada se sale, la página no se corre, las pestañas
   de la tienda llegan al final). Pedirle a Inty captura o video.
3. La navegación a destino guarda su trazo aparte (`gpsPoints` en funciones-mapa-viajes.js): el relleno del hueco
   todavía no corre ahí.
