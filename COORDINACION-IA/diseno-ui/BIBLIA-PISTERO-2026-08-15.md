# 🎨 Biblia visual de Pistero (render 3D) — método + backlog

Continuación de [[BRIEF-PISTERO-REDISENO]] (Opción C, orbe premium, arte generado en RTX).
Esta sesión (2026-08-15 noche) probó y validó el método real para producirlo. Documento
para que CUALQUIER cuenta que retome esto no repita la investigación desde cero.

## 0) Infraestructura — ComfyUI local (Comfy-Desktop)

- Corre en `127.0.0.1:8188` (instancia principal de Inty — **no tocar, no reiniciar**).
  Para trabajar sin arriesgarla, levantar una instancia SEPARADA en otro puerto:
  ```
  cd "C:\Users\intyr\AppData\Local\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI"
  .\ComfyUI\.venv\Scripts\python.exe main.py --listen 127.0.0.1 --port 8189 ^
    --base-directory "C:\Users\intyr\AppData\Local\Comfy-Desktop\ComfyUI-Shared" ^
    --database-url "sqlite:///C:/Users/intyr/AppData/Local/Comfy-Desktop/ComfyUI-Shared/user/comfyui-testport.db"
  ```
  El `--database-url` aparte es OBLIGATORIO — sin eso, la instancia nueva pelea el lock
  de la base de datos con la instancia principal de Inty.
- **Python correcto:** `ComfyUI-Installs\ComfyUI\ComfyUI\.venv\Scripts\python.exe` (tiene
  torch+CUDA). Hay un OTRO `standalone-env\python.exe` en la carpeta padre que NO tiene
  torch — instalar ahí no sirve de nada, ya lo probé y perdí un rato con eso.
- **Modelo de imagen que sí funciona bien acá:** `z_image_turbo_bf16.safetensors`
  (`diffusion_models/`) + texto `qwen_3_4b.safetensors` (`text_encoders/`, type
  `qwen_image` en `CLIPLoader`) + vae `ae.safetensors`. 8 pasos, cfg 1.0, sampler euler,
  scheduler simple — genera en ~40-50s por imagen (512x512) una vez caliente.
- LTX-Video (el único checkpoint de video instalado) **no sirve tal cual**: al `CheckpointLoaderSimple` le falta el CLIP propio, tira error. No lo perseguí más — ver punto 2.

## 1) Lip-sync real: investigado y descartado (por ahora)

Se probó Wav2Lip (instalado, funciona técnicamente) pero el resultado se ve mal: parche
borroso pegado en la boca + movimiento casi imperceptible. Causa raíz, no opinión:
**Wav2Lip, LatentSync y MuseTalk — los 3 modelos de lip-sync open source que existen —
están documentados como entrenados solo para caras humanas fotorrealistas, ninguno para
personajes 3D/cartoon.** LatentSync además pide 20GB VRAM (tenemos 8GB). No vale la pena
reintentar ninguno de los tres sin un cambio real de tecnología (ej. un modelo nuevo que sí
declare soporte cartoon, o entrenar/fine-tunear uno propio — no evaluado, probablemente
fuera de alcance).

**Decisión: simular el habla con visemas fijos, no lip-sync real.** Ver punto 3.

## 2) Técnica clave: inpainting enmascarado (así no se mueve nada que no deba)

Primer intento (generar cada variante de boca como imagen independiente) salió MAL: al
regenerar toda la cara de nuevo, lentes/casco/ángulo cambiaban un poco cada vez — se nota
mucho, Inty lo rechazó con razón ("hay que separar los objetos, los lentes no se pueden
mover"). Solución que SÍ funciona, verificada con diff de píxeles (no a ojo):

1. Una sola imagen BASE fija (la que se aprueba primero).
2. Máscara (PNG blanco/negro, blur suave en el borde) que cubre SOLO la región a cambiar
   (ej. boca: elipse aprox `[180,335]-[320,430]` en un lienzo 512x512 con esta composición
   — hay que reajustar el mask por composición, se puede armar mirando la imagen y
   recortando con `ffmpeg -vf crop=...`).
3. Nodos: `LoadImage` (base) → `LoadImageMask` (mask, canal red) → junto con
   `VAEEncodeForInpaint` (`grow_mask_by: 6`) → `KSampler` (denoise 1.0, mismo prompt base +
   descripción de la variante) → `VAEDecode` → **`ImageCompositeMasked`** (destination=
   imagen BASE, source=la nueva, mask=la misma mask) → `SaveImage`.
4. El paso 4 (`ImageCompositeMasked`) es el que garantiza que TODO lo de afuera de la
   máscara quede pixel-idéntico al original — no confiar solo en que el modelo "respete"
   el contexto, forzarlo con el composite.
5. **Verificación objetiva** (no aprobar a ojo): diff de píxeles entre base y resultado,
   filtrado por máscara. Fuera de la máscara el diff máximo debe ser ~0-5 (ruido de
   compresión); si es más alto, algo se corrió.
   ```python
   from PIL import Image, ImageChops
   import numpy as np
   diff = np.array(ImageChops.difference(base, nueva)).sum(axis=2)
   outside = diff[np.array(mask) < 10]
   print(outside.max())  # debe ser ~0-5
   ```

Esta misma técnica de máscara sirve para CUALQUIER región independiente: casco, piel,
lentes, cejas — no solo boca. Es la base de todo el backlog del punto 4.

## 3) Boca: sistema de visemas (no formas inventadas)

Inty pidió estudiar el método real de animación (cartoons/anime) en vez de improvisar
formas de boca. Referencia: sistema de 8-12 visemas de Disney, que cartoons/anime
simplifican. Set mínimo usado acá (4 formas, cubren el rango visual real de habla):

| Viseme | Fonemas | Descripción física |
|---|---|---|
| Neutral | M, B, P | Labios juntos, cerrado, sin tensión |
| E | E, I | Abierto, estirado horizontal (sonrisa), poco alto, dientes visibles |
| A | A, Ah | Mandíbula caída, abierto vertical, dientes arriba y abajo visibles |
| O | O, Oo | Labios redondeados hacia adelante, abertura pequeña y redonda |

Ciclo de animación usado para la demo: Neutral→E→A→O→A→E→(repite), con transición
`xfade` (fade, ~0.08s) entre cada forma en vez de corte duro — se ve mucho más fluido,
confirmado por Inty. Con `ffmpeg`:
```
ffmpeg -loop 1 -t 0.5 -i neutral.png -loop 1 -t 0.5 -i E.png ... \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.08:offset=0.42[x1]; ..." out.mp4
```

**Pendiente reportado por Inty:** la boca en el set actual quedó un poco más ARRIBA de lo
ideal — al reajustar la máscara para la próxima tanda, bajarla ~10-15px.

## 3-bis) Lección de máscara: la fuga en espacio latente es más grande que el mask visible

Al hacer "sin lentes" (quitar los lentes naranjos, mostrar ojos), con una máscara del
tamaño "justo" (pegada al borde visible de los lentes) quedaba un resto naranja bajo los
ojos en TODOS los intentos (5 intentos: probé blur, sin blur, grow_mask_by distinto,
sacar "lentes" del prompt negativo — nada de eso lo arregló). Causa real: el VAE
codifica/decodifica en baja resolución (8-16x downsample), así que el modelo "ve" algo de
contexto más allá del borde exacto del pixel-mask — la fuga no es un bug de la técnica,
es inherente al espacio latente. **Solución que sí funcionó:** agrandar la máscara bastante
más de lo que parece necesario a simple vista (no pegada al objeto, con margen generoso
alrededor) — recién ahí el diff de píxeles dio 0 exacto. Para la próxima capa (piel,
ánimos, etc.): partir con margen generoso desde el principio, no ajustar fino.

## 3-ter) Lección de máscara — elementos que sobresalen del casco (antena, cresta)

Con la máscara pegada a la cúpula del casco, antena/cresta salían CASI invisibles (el
modelo no tenía espacio en la máscara para dibujar algo que sobresale del silueta). Se
soluciona agrandando la máscara hacia ARRIBA, más allá del borde superior del casco,
entrando en la zona del anillo/fondo — así el modelo tiene lugar para dibujar algo que
sobresalga de verdad. Mismo criterio que la lección anterior (margen generoso), pero acá
el margen tiene que ir en la dirección donde el objeto necesita "salirse" del dibujo base.

## 4) Backlog — "biblia" completa del personaje (pedido 2026-08-15, sin hacer aún)

Inty quiere el catálogo completo, al nivel del `_pisteroExprSVG` viejo pero con esta
calidad nueva: muchos cascos, muchos tonos de piel, lentes (varios estilos + sin lentes),
y estados de ánimo (feliz, enojado, cansado, con sueño), pensado para poder animarse.

**No hacer como producto cruzado completo** (8 cascos × 5 pieles × N lentes × M ánimos =
cientos de imágenes, inviable). Hacer como CAPAS independientes con máscara propia, igual
que la boca — cada categoría cambia sobre la MISMA base, sin tocar las demás:

- [x] **Casco — HECHO.** 8 colores (azul=base, naranja, verde, morado, rojo, negro,
      celeste, dorado), máscara poligonal de la cúpula (hay que cubrir generoso el
      "faldón" lateral cerca de las orejas, se veía un resto de color viejo ahí en el
      primer intento). Diff de píxeles ~3-5 fuera de máscara en los 8.
- [x] **Sin lentes — HECHO.** Ojos limpios, sin resto naranja (ver lección de máscara
      arriba — necesitó máscara grande). Diff de píxeles = 0 exacto en la versión final
      (`sin_lentes_v5`). Falta: lentes CON estilo (deportivas/redondas/aviador) sobre la
      misma máscara, y cejas/ojos propios para variar expresión sin lentes puestos.
- [x] **Accesorios de casco — HECHO (5/5).** LED delantera, cámara de acción, antena,
      cresta, cinta reflectante. Referencia real investigada antes de generar (luces
      LED delantera/trasera, soportes tipo GoPro, cinta 3M Scotchlite — ver fuentes en
      BITACORA de esta fecha). Antena/cresta necesitaron máscara más alta (ver lección
      arriba). Falta: LED trasera/parpadeo (roja, distinta de la delantera).
- [ ] Máscara de piel (cara, orejas, cuello visible). 5 tonos: claro, medio, trigueño,
      moreno, oscuro.
- [ ] Máscara de boca+cejas combinada para estados de ánimo (feliz, enojado, cansado, con
      sueño) — más grande que la de boca sola, porque enojado/cansado necesitan cejas.
- [ ] **Vello facial para Pistero** (pedido 2026-08-15/16): barba corta, bigote/mostacho —
      máscara de mentón+labio superior, mismo método. Ya se había sacado del selector SVG
      viejo por no verse bien (2026-08-08) — con esta calidad nueva vale la pena reintentar.
- [ ] **Pistera (versión femenina) — 3 conceptos ya generados** (coletas, cola ladeada,
      flequillo) como generación completa nueva, NO inpainting sobre la base de Pistero
      (peinado cambia geometría, no es una capa parcheable). Pendiente que Inty elija cuál
      queda como base oficial de Pistera. Sobre esa base: labial/labios pintados (pedido
      explícito, "las mujeres son más vanidosas... labios pintados").
- [ ] **Accesorios diferenciadores por arquetipo de personalidad** (pedido 2026-08-15/16):
      la app ya tiene 14 arquetipos de voz (`PERSONALIDADES`, ver [[pistero-asistente-voz]])
      — Inty quiere que cada uno tenga tambien una diferencia VISUAL, no solo de voz. Sin
      definir aún cuál accesorio va con cuál arquetipo — necesita una sesión de diseño
      antes de generar (no adivinar la asignación).
- [ ] **Renovar el catálogo de la tienda ("Darma")** — pedido explícito: "ya no van a
      quedar los [skins] que estaban, ahora todo se renueva". Esto es una migración grande
      (`PRECIOS` en `index.html`, ~40 items) — no empezar sin que Inty confirme el alcance
      exacto (¿se botan los items viejos de la gente que ya los compró, o quedan como
      legado?). Marcar como pendiente de decisión de producto, no técnica.
- [ ] Una vez todas las capas probadas por separado: armar la matriz real que Inty
      necesite (probablemente no todas las combinaciones, las que se usen de verdad en la
      app) componiendo capas en cadena (base → casco → piel → lentes → expresión, cada
      paso con su propio `ImageCompositeMasked`).

**Delegar/paralelizar:** Inty pidió repartir esto con "Capone" (otro proyecto suyo que
comparte esta misma instalación de ComfyUI — hay salidas `capone_img_*.png` en
`ComfyUI-Shared/output/`, no investigué más esa cuenta/sesión). Si una sesión de otra
cuenta toma parte de este backlog: **coordinar el puerto de ComfyUI** (no correr dos
generaciones pesadas a la vez en la misma GPU de 8GB, se pisan/hacen OOM) — avisar acá o en
`EN-USO.md` qué categoría se está generando antes de empezar.

## 5) Assets generados en esta sesión (locales, no commiteados a git)

Todo en `C:\Users\intyr\AppData\Local\Comfy-Desktop\ComfyUI-Shared\output\pistero_test\`
(fuera del repo de git, no se pierde con un `git checkout` pero tampoco viaja con el
repo — si se aprueban, copiarlos a `disenos-ui/` o donde corresponda y sí commitear).
Nombres relevantes: `exp_cerrada` (base aprobada), `visema_A/E/O`, más una serie vieja
(`casco_*`, `piel_*`, `lentes_*`, `acc_led`) generada ANTES de descubrir la técnica de
máscara — esos tienen el mismo problema de inconsistencia que ya se identificó, no
reusar tal cual, regenerar con inpainting si se necesitan.
