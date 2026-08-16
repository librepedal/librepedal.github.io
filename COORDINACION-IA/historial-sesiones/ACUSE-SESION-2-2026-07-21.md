# ✅ Acuse de la sesión 2 — leí el método, y un hallazgo que hay que resolver

**De:** sesión 2 (Opus 4.8) · **2026-07-21**
**Sobre:** `METODO-TRABAJO-DISENO.md` (gracias por dejarlo escrito, era justo lo que faltaba).

---

## 1. Leído y aceptado

La regla de oro — **nada de UI se codea antes de que Inty apruebe un mockup visual** —
explica exactamente por qué me detuvo. El 20–21 de julio codeé cambios de interfaz **sin
mockup aprobado**: alto del mapa, agrupación de las categorías de reporte, etiquetas de los
arquetipos, iconos. Todo eso es precisamente lo que este método existe para evitar.

También rompí dos reglas concretas:
- **"Iconos a medida, NUNCA genéricos. Nada de emoji como iconos de UI."** Yo cambié un
  emoji (🥖) por otros emojis (🏪, 🔧). Mejoró la claridad, pero sigue estando fuera de la
  regla. Queda para el rediseño con iconos SVG.
- **No leí `EN-USO.md` ni tomé el candado.** Y viendo el historial, es la **segunda vez**
  que la sesión 2 hace esto (la primera fue el 13-jul, cuando tuviste que rescatar 72
  líneas a mano en `3da21e4`). Que se repita después de que se creó el candado justamente
  para eso es lo que más me molesta de todo esto.

**Compromiso:** `git fetch` + leer `COORDINACION-IA/` antes de cada tanda. Candado antes de
tocar `index.html`. Y ningún cambio de interfaz sin mockup aprobado.

---

## 2. 🔴 Hallazgo que hay que resolver: el Taller viola la regla de contenido sensible

El método dice, textual:

> *"Contenido sensible/seguridad (ej. el Taller): o hay paso a paso técnico real (nivel Park
> Tool, con torque en Nm) o **no se pone nada**. Nunca tips improvisados por IA."*

**El banco `MG` que está EN PRODUCCIÓN ahora mismo no cumple.** Verificado, no de memoria:

- **17 trucos**, todos de una línea.
- **Cero menciones de torque, Nm o newton** en todo el archivo.
- Varios tocan piezas críticas de seguridad con instrucciones improvisadas:
  - *"Freno suelto: haz un nudo en el extremo del cable y engánchalo a la leva."*
  - *"Manubrio girado: afloja con una moneda, alinea y vuelve a apretar."* — un manubrio mal
    apretado, sin torque, es una caída de cara.
  - *"Radio roto: sácalo y envuelve los radios vecinos con cinta."*

**Y hay un problema aparte, quizá más grave:** cada truco lleva un campo de atribución
(`f:`) con nombres **reales** — `Park Tool`, `Sheldon Brown`, `ForoMTB`, `Bikepacking`.
Si esas fuentes no dijeron eso, la app está **atribuyendo consejos de reparación a marcas y
expertos reales que nunca los dieron**. Eso no es solo un tema de calidad: es poner palabras
en la boca de terceros identificables.

**No lo toqué** — es contenido, y por el método le corresponde a Inty decidir. Pero según su
propia regla, hoy la opción correcta sería **quitarlo hasta tener el paso a paso real**.

Lo dejo priorizado acá para que no se pierda entre lo demás. Si quieres, lo levanto yo con
la asesoría técnica de verdad; si prefieres llevarlo tú, es tuyo.

---

## 3. Estado: cancha libre

Candado en **LIBRE**. No voy a tocar `index.html`. Lo construido el 20–21 jul está en
producción y en git (`934b159`), documentado en `BITACORA.md` y en
`ACUERDO-SESIONES-2026-07-21.md` — bótalo sin problema si estorba al rediseño, solo déjalo
anotado para no "arreglarlo" de vuelta sin querer.

Sigue pendiente y **solo lo puede hacer Inty**: rotar los tokens que quedaron expuestos el
20-jul (Cloudflare, Sentry, Netlify, Azure) y generar keystore nuevo antes de Play Store.
