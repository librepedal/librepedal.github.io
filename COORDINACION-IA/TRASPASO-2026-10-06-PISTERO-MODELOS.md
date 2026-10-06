# Traspaso 2026-10-06 — Pistero: modelos que la gente elige (rama `feature/armario-piezas`)

Para cualquier cuenta Claude que retome. Léelo entero antes de tocar nada de Pistero.
El trabajo de app de la revisión 8.809 sigue en `TRASPASO-2026-10-05-REVISION.md` (aún sin publicar).

## 1) Qué pidió Inty (en sus palabras, resumido)
- El Pistero se rediseña en **varios modelos a elegir** ("la gente será quien elija"), en "Elige tu Pistero".
- Cada modelo es **un rostro con casco, de frente, sin toque humano** (nada de piel, nariz u orejas humanas). Ni objetos ni animales.
- **Cada modelo tiene su propio estilo de animación.**
- El arte lo dibuja **Gemini** (cuenta de Inty, Chrome). Claude **no** dibuja personajes a mano en SVG: Claude separa capas, recorta y anima.
- **Un modelo a la vez**, mostrado y confirmado por Inty antes de seguir.

## 2) Reglas que Inty fue corrigiendo (todas obligatorias)
1. Casco **limpio**: sin anteojos/visera encima y **sin correas** colgando. Los lentes serán un accesorio aparte que calce en todos los modelos (molde).
2. Por las **ventilaciones del casco no debe verse la cabeza**: los huecos encerrados se rellenan con el acolchado (función `_rellenarVentilaciones`, inundación desde los bordes).
3. Nada de **franjas o líneas que crucen la cara** (se quitó la franja de interferencia del cyberpunk).
4. Rostros **compactos**: bajo el casco la cara es más corta que ancha, mejillas cortas, mentón alto. **Sin orejeras ni bordes/marcos alrededor de la cara.**
5. El casco debe **abrazar** la cabeza, orgánico, sin sobresalir (venía del orbe).
6. Mentones redondos que sigan la forma real (nunca cortes planos).
7. Investigar referencias reales cuando Inty nombra una (ej. Gort de *El día que la Tierra se detuvo*).
Las mismas reglas están en la memoria de la cuenta (`pistero-modelos-no-humanos.md`, `personajes-no-a-mano.md`).

## 3) Estado de cada modelo
| Modelo | Estado | Página para Inty | Código |
|---|---|---|---|
| Orbe (flota) | ✅ movimiento aprobado | https://claude.ai/artifact/2uAw3jbYkAUXncz8wexQLR | `disenos-ui/pistero-nuevo/vector/orbe-capas.js` |
| Slime (gelatina que tiembla) | mostrado; Inty dijo "sigue" | https://claude.ai/artifact/UprESmTh77zUxkf4gaaxdd | `vector/slime-capas.js` |
| Androide de vinilo (servos, ojos de diafragma, boca LED) | corregido (lentes, mentón, ventilaciones); Inty dijo "sigue" | https://claude.ai/artifact/KKUrHnURYQDQND7KEXb9xb | `vector/vinilo-capas.js` |
| Cyberpunk (a saltos 12 fps, visor tipo **Gort**) | ✅ **aprobado** ("queda") | https://claude.ai/artifact/5VmaCv5YfCRd2V7uAbLSdC | `vector/ciber-capas.js` |
| Vidrio y luz (trazos de luz) | ⏳ **forma de la cabeza en revisión** | animación: https://claude.ai/artifact/NiR44kv55v45irsS3heDvU · forma: https://claude.ai/artifact/Jr8rq2ADQekRvvrwG6KaCY | `vector/vidrio-capas.js` |

### Vidrio y luz — dónde quedó exactamente
- Inty rechazó la cabeza en cápsula alargada, y luego ampolleta/cubo/gota (`gemini/vidrio-formas.jpg`).
- Pidió **forma como el cyberpunk** → `vidrio2-frente.jpg` → "sin orejas ni el borde de la cara" → `vidrio3-frente.jpg`
  → "mentón muy abajo, mejillas largas, más compacto" → **`vidrio4-compacto.jpg`** (última, en la página de forma, **sin respuesta aún**).
- Siguiente paso: si Inty aprueba `vidrio4-compacto.jpg`, pedir a Gemini (mismo chat) su capa de cabeza **sin cara** y fondo azul marino;
  el casco puede reutilizar `gemini/vidrio-capa-casco.jpg` si coincide la posición (verificar midiendo). Luego ajustar en `vidrio-capas.js`
  la máscara/recorte del frente (`geo.frente`), `EY/EX/BY/MY` (posiciones de cejas, ojos y boca) y regenerar la página con `herramientas/armar-vidrio.mjs`.

## 4) Cómo funciona el armado por capas (igual en todos)
- Gemini entrega 2 imágenes 1376×768 en la **misma cámara**: (a) casco solo en verde croma #00FF00, (b) cabeza/cuerpo sin cara en azul marino (o verde).
- En el navegador: se recorta el fondo (verde por exceso de G; azul marino por distancia de color), se quitan correas por altura, se rellenan ventilaciones.
- "Sándwich": cabeza atrás → casco → **frente de la cabeza recortado bajo el borde del casco** (clipPath) → cara en vector.
- La cara (ojos, boca, luces) es vector para poder animar estados: `reposo, hablar, feliz, sorpresa, dormir`. API: `crearXCapas(el, urlCasco, urlCabeza) → Promise<{estado(n)}>`.
- Páginas de prueba: `vector/<modelo>-capas.html` (servidor local `npx serve . -l 5192` en el worktree). Página publicable autocontenida (imágenes en base64): `vector/<modelo>-capas-pub.html`, generada con `disenos-ui/pistero-nuevo/herramientas/armar-<modelo>.mjs` (usa `plantilla-orbe-pub.html`; correr con node desde esa carpeta).

## 5) Cómo producir con Gemini sin molestar a Inty (Claude in Chrome)
- Chat con todo el contexto de los modelos: **https://gemini.google.com/app/33df4033dcc9687b** (largo; si se cuelga, prompts cortos).
- Función `gen(prompt)` inyectada en la pestaña (inserta texto en el editor con `execCommand('insertText')`, clic en "Enviar mensaje" y espera la imagen). Ver el código en el historial o reescribirla: ~10 líneas.
- **Descarga:** la imagen trae `.../gg-dl/...=s1024-rj` → cambiar a `=s0`, abrirla en una **pestaña auxiliar** (el `navigate` redirige a `rd-gg-dl/...` firmado), leer la URL final del título de la pestaña y bajarla con `curl`.
- Si la imagen aparece como `blob:` → **recargar el chat**: queda como `.../gg/...`; mismo método (redirige a `rd-gg/...`).
- La ventana de Chrome está oculta: capturas de pantalla fallan; usar JS. Los temporizadores en pestañas ocultas van lentos: esperar con varias llamadas de ~38 s.

## 6) Cómo verificar (Inty no es el control de calidad)
- El panel del navegador de la app limita la animación (~3 cuadros/s o pausa si está oculto). En las páginas de prueba se puede forzar con `?rafx=1` (ver `ciber-capas.html`; copiar ese `<script>` a otras).
- Capturas grandes de cada estado: serializar el `<svg>` a canvas y enviarlo al receptor local `herramientas/receptor.mjs` (puerto 5199, guarda en `gemini/`; mover las `_cap-*.png` fuera del repo después).
- Revisar cada estado en grande y a tamaño de barra (44 px). No publicar sin mirar.

## 7) Pendientes (en orden)
1. Respuesta de Inty sobre `vidrio4-compacto.jpg` → capas y animación del vidrio.
2. Accesorios por molde (lentes, otros cascos) que calcen en los 5 modelos (`vector/molde.js`, `molde-ref*.html`).
3. Integrar los modelos en "Elige tu Pistero" de la app (con mockup aprobado y OK de Inty; nada a `main` sin su ✓).
4. Lo que sigue abierto de antes (ver `TRASPASO-2026-10-05-REVISION.md`): publicar 8.809 (lo hace Inty), Comunidad segura pieza 1 + 2 decisiones,
   colores de casco (https://claude.ai/artifact/C664p77d9bZkrxVUHZ9vig), AAB nuevo con google-signin + plugins de archivos, pegar ficha en Play Console.
