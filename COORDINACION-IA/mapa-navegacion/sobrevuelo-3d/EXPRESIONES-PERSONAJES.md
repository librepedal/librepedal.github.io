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

## Estado por personaje
| Personaje | Arte | Los 12 estados | Dónde |
|---|---|---|---|
| Pistero actual | vector de la app | ✅ (10 de la app + agotado/adrenalina/orgulloso armadas sobre su cara) | `sobrevuelo-3d.js` `caraPistero` |
| Pistero Cyberpunk (aprobado) | casco y cabeza de Gemini (feature/armario-piezas) | ✅ 2026-10-07, en su lenguaje: visor-ranura tipo Gort, boca LED, 12 cuadros/s, interferencia | `personajes/ciber-capas.js` (copia + extensión marcada SOBREVUELO, para fusionar en su rama) |
| Pistero Orbe (movimiento aprobado) | casco y orbe de Gemini | ✅ 2026-10-07 (cara de luz 45 % más grande, cejas de luz, jadeo, tinte rojo, halo de color) | `personajes/orbe-capas.js` |
| Pistero Slime | casco y gelatina de Gemini | ✅ 2026-10-07 (cejas, párpados de gelatina, jadeo, se derrite, tinte) | `personajes/slime-capas.js` |
| Pistero Androide de vinilo | casco y cabeza de Gemini | ✅ 2026-10-07 (diafragma, párpados de vinilo, cejas y boca LED, servo, LED que fallan) | `personajes/vinilo-capas.js` |
| Pistero Vidrio | Gemini | ⏸ espera que Inty apruebe la forma `vidrio4-compacto.jpg` y sus capas (la capa actual es la cápsula que Inty rechazó) | feature/armario-piezas |
| Mascotas (6) | Gemini | ⏸ por ahora sin mascota en el sobrevuelo (Inty 2026-10-07); necesitarán sus caras por estado desde Gemini | feature/mascotas |

Cyberpunk, cómo se ve cada estado: feliz = luz que recorre la ranura y sonrisa · contento = ranura en arco · guiño = media
ranura en arco · preocupado = ranura quebrada hacia arriba · cansado = ranura a medio cerrar, más tenue, jadeo · enojado =
ranura en V naranja y dientes de LED · agotado = "batería baja": rojo que parpadea, jadeo, cabeza caída, interferencias ·
emocionado = arco, boca que ríe y una línea de viento · adrenalina = ranura abierta, luz que barre, grito, viento ·
sorprendido = ranura abierta y boca en O · orgulloso = arco dorado con destellos · pensando = luz a un lado y puntos.
