# Expresiones que necesita el sobrevuelo — para TODOS los personajes

Pedido de Inty (2026-10-07): "las expresiones tienen que ser bien acorde a todo lo que pasa" y "hay que adaptarlo a
todos los personajes que estamos desarrollando". El sobrevuelo muestra al personaje como **rostro** sobre el rastro
neón y le pide un **estado** según la ruta. Cada personaje debe entregar su cara para cada estado.

Personajes en desarrollo (2026-10-07): **Pistero actual** (listo, `_pistoDe` + 3 armadas encima), **Pistero nuevo /
orbe** (`feature/armario-piezas`, `disenos-ui/pistero-nuevo/`), **mascotas** pudú, zorro culpeo, huillín, ranita de
Darwin, güiña y Yorkshire (`feature/mascotas`). Regla del protocolo: personajes nuevos NO se dibujan a mano; salen de
referencias + generador de imágenes y luego se vectorizan.

| Estado | Cuándo lo pide el sobrevuelo (dato real de la ruta) | Qué tiene que transmitir | Si falta, usa |
|---|---|---|---|
| feliz | plano, ritmo normal | tranquilo, disfrutando | — |
| contento | partida (primeros 250 m); últimos 600 m (se ve la llegada); llegada (últimos 120 m, aunque suba) | alegría | feliz |
| guino | recién terminó una cuesta (4 s) | alivio, "lo logré" chico | feliz |
| preocupado | en plano y viene una cuesta de +6 % en ~170 m | "uy, lo que viene" | pensando |
| cansado | subida 3,5–8,5 % (sale bajo 2,5 %) | esfuerzo, sudor | feliz |
| enojado | subida +8,5 % (aprieta los dientes) | máximo esfuerzo | cansado |
| agotado | subida dura con +25–45 m en la cuesta, o mucho subido en el día (+220–260 m) | sin aire, boca abierta, sudor | cansado |
| emocionado | bajada 2–7 % | disfrute, velocidad | feliz |
| adrenalina | bajada +7 % | velocidad máxima, viento | emocionado |
| sorprendido | curva cerrada (+55° en plano) | "¡ojo!" | emocionado |
| orgulloso | cima (±150 m de lo más alto del viaje) | triunfo | contento |
| pensando | pausa / detenido (cuando la ruta tenga horas por punto) | descanso | feliz |

Además, para el rostro: anillo del color neón de la pendiente, latido 1,15 s (plano) → 0,42 s (subida más dura),
gota de sudor con esfuerzo fuerte. Cada personaje entrega **una cara por estado, de frente, centrada en un círculo**
(mismo encuadre que `.cm-c` en `index.html`).

Para conectar un personaje: `PERSONAJES['id']={id, tiene(estado), cara(estado) → SVG o <img>}` en `sobrevuelo-3d.js`.
