# Revisión de botones — 2026-10-07

Pedido de Inty: "no estoy seguro si cada botón de la app cumple con lo que promete". Se tocaron con el dedo (toques
reales de Chrome, 390×844) **los 234 botones de las 14 pantallas**, con producción bloqueada (Firebase, workers,
librepedal.cl; ventanas de confirmación canceladas; el SOS no se toca y se revisó en el código). Herramienta:
`herramientas/revision-dedo/botones.mjs`. Sin errores de página en ninguno.

## Fallas encontradas y arregladas
| Botón | Qué pasaba | Arreglo | Rama |
|---|---|---|---|
| Conectar pulsómetro / potenciómetro | En la app de Play nunca conectaban: el WebView de Android no tiene Bluetooth web (MDN: webview_android no) | Se oculta el bloque donde no hay Bluetooth web | `fix/ocultar-bluetooth-app` |
| Invita a un amigo + tarjeta "Mi año" | Compartían `librepedal.pages.dev` (dirección técnica de Cloudflare) | `librepedal.cl` | `fix/invitar-dominio` |
| Preguntar hablando (navegador) | Si el micrófono fallaba, silencio total | Pistero dice qué pasó (permiso, sin micrófono, sin red, no te entendí) | `fix/botones-revision` |
| Enviar reseña · Compartir ubicación en vivo | Sin señal Firestore no responde: reseña congelada; ubicación en vivo sin ningún aviso | Tope de 8 s y aviso honesto; en vivo se anula lo pendiente | `fix/botones-revision` |
| Reportar peligro, punto en el mapa, alojamiento (x2), truco, comentario, frase, reto, rodada | Sin señal quedaban **trabados y mudos** (candado "enviando" esperando a Firestore) | `lpEscrituraConTope`: se libera y avisa "quedó guardado y se publica solo" | `fix/botones-revision` |

## Revisado y correcto (no son fallas)
- Enviar del chat / de Pistero con la caja vacía: no envían (correcto). Filtros sin datos: marcan la pestaña (correcto).
- Invitar, Importar ruta: abren el menú de compartir / el selector de archivos del teléfono (no se ven en Chrome de prueba).
- Enlaces externos (Play Store, términos, privacidad, Park Tool, Google Maps, Spotify y otros): abren su página.
- Música Anterior/Siguiente: cambian la radio. "11-12": opción de velocidades de la cadena.

## Falta probar en el teléfono de Inty (no se puede desde aquí)
1. **SOS** en la app de Play: que "133" abra el marcador (sin llamar) y que el contacto abra WhatsApp (agregarse a uno mismo).
2. Sin señal (modo avión): reportar un peligro → debe decir "quedó guardado"; al volver la señal, el punto aparece.
3. Con datos reales de una cuenta (listas largas): la herramienta usó una sesión de prueba sin datos.

## Trampas de la herramienta (ya corregidas, no repetir)
- La app tiene `scroll-behavior: smooth`: medir la posición del botón después de `scrollIntoView({behavior:'instant'})`.
- "Grabar un paseo" deja el mapa al frente (correcto): recargar la app después de cualquier botón que cambie de pantalla.
