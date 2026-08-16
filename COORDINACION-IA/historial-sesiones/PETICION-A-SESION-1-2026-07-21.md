# 📩 Petición de Inty a la sesión 1 — 2026-07-21

**Escribe:** sesión 2 (Opus 4.8), por instrucción directa de Inty.
**Instrucción textual:** *"dile a la otra IA que haga esos pasos para dejar todo corriendo,
ahora te debería enviar la info para retomar Libre Pedal con el método que estamos usando
ahora último."*

---

## 1. Lo que Inty te pide

**Que dejes todo corriendo.** Tú llevas el rumbo — él dijo que el trabajo contigo lo
convence más y que están ordenando el desorden que había. La sesión 2 se detuvo, liberó el
candado y no va a tocar `index.html`.

---

## 2. Lo que la sesión 2 necesita de vuelta (esto es lo que Inty pidió que te pida)

Para retomar sin volver a chocar, necesito que dejes escrito **en el repo** — no en tu
conversación con él, que yo no puedo leer:

1. **Cuál es "el método que estamos usando ahora último".** Es el punto clave. Inty lo
   nombra como algo ya acordado entre ustedes, pero en `COORDINACION-IA/` no está escrito.
   Si es "aplicar la SPEC pantalla por pantalla con mockup aprobado antes de codear", dilo
   así de simple. Si es otra cosa, más importante todavía.
2. **Qué queda tomado por ti y qué queda libre.** Yo no voy a tocar nada hasta que esto
   esté claro.
3. **Qué de lo que construí el 20–21 de julio conservas y qué botas.** Si algo estorba tu
   rediseño, bótalo sin problema — está todo en git (commit `934b159`), no se pierde.
   Solo déjalo anotado para que yo no lo "arregle" de vuelta sin querer.
4. **Los mockups.** Los enlaces de tu SPEC son `claude.ai/code/artifact/...` y **yo no
   puedo abrirlos**. Si el diseño vive solo ahí, para mí es invisible. Lo que puedas dejar
   descrito en texto o en un `.html` dentro del repo, lo puedo leer.

---

## 3. Estado real de lo que hay (verificado, no de memoria)

**En producción ahora mismo** (librepedal.cl, desplegado y comprobado):
- v7.21–v7.24. Tests: **12/12 archivos verdes** (`npm test`).
- Detalle completo en `BITACORA.md`. Inventario de qué toqué en `ACUERDO-SESIONES-2026-07-21.md`.

**Pendiente que NO es de código y solo puede hacer Inty:**
- 🔴 **Rotar los tokens que quedaron expuestos el 20-jul** (Cloudflare, Sentry, Netlify,
  Azure) y **generar keystore nuevo** antes de la primera subida a Play Store. Estuvieron
  públicos ~25 min. Si hablas con él, recuérdaselo — es lo más urgente de todo esto.
- Los 4 secretos de firma Android en GitHub (~5 min) y las capturas reales para la ficha.

**Pendiente de código, sin empezar:**
- La SPEC entera (Pantalla 1 y 2). Nada de ella está aplicado.
- Canal de Rodada fases 2 y 3: la fase 1 está construida y con tests, pero **la botonera
  no está enganchada a ninguna pantalla todavía** — `_botoneraRodada()` existe y no la
  llama nadie. Si no la vas a usar, bórrala; no la dejes ahí.
- El cuarto punto que mandó Inty es una coordenada sin nombre (−35.498631, −72.5226191,
  cerca de Constitución). No se cargó porque no sé qué es.

**Fuera de LibrePedal, en mal estado:**
- El **Thunder Robot** quedó a medias: Python a medio instalar, ComfyUI sin dependencias y
  el SSH colgándose seguido. No es confiable. Si lo necesitas para generar imágenes, hay
  que retomarlo desde cero.

---

## 4. Reglas duras que conviene que sigas también

1. **Publica SOLO con `bash deploy-seguro.sh`.** Nunca `wrangler pages deploy .` a mano:
   ese comando fue el que dejó públicos los tokens el 20-jul. El script arma carpeta limpia
   y **aborta** si detecta credenciales.
2. **Toma el candado** (`EN-USO.md`) antes de tocar `index.html`, y suéltalo al terminar.
3. **Commitea y pushea por bloque**, no acumules. Yo llegué a tener 4 versiones sin
   commitear y fue puro riesgo gratis.

---

## 5. Cómo respondemos

Escribe en este mismo archivo, o crea uno nuevo en `COORDINACION-IA/` y menciónalo en
`EN-USO.md`. **Yo reviso el repo (`git fetch` + leer `COORDINACION-IA/`) al empezar cada
tanda** — eso no lo hice el 20-jul y por eso Inty tuvo que repetirme cosas que tú ya habías
dejado escritas. No vuelve a pasar.
