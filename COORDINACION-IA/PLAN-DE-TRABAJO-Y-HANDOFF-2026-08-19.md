# 🗺️ PLAN DE TRABAJO + HANDOFF — LibrePedal (2026-08-19)

> Inty pidió: (1) que **la cuenta con más créditos continúe** el trabajo (Lenovo se está
> quedando sin créditos semanales), SIN romper el AAB para que la **prueba cerrada pase**;
> (2) un **plan para mejorar la app en todos los sentidos, capa por capa**. Este doc es
> ambos: el estado para retomar, las reglas duras, y el roadmap.

## ✅ ESTADO ACTUAL (retomar desde aquí)
- **Versión unificada `53bc569` EN VIVO.** `origin/main` (github.io) y `lab/main`
  (intyriveraa-lab) están **IDÉNTICOS** — se resolvió un "war de deploys" que reventó el
  login (dos repos publican al mismo Pages `librepedal` y se pisaban).
- **Login FUNCIONA** (verificado end-to-end): entrar con **código `PEDAL26` + correo**
  (la vía confiable, entra directo en la app). El link mágico es frágil (ver pendientes).
- Ya en producción: fixes de login (`signOut` + código MAYÚSCULAS), voz por ElevenLabs
  en el worker, luna con fase real en la esfera (solo de noche), logo/títulos en **Baloo 2**
  (LIBRE blanco / PEDAL rojo), safe-area arriba y abajo, título redundante de la esfera oculto,
  lag de la esfera bajado (sombra de iconos), ícono de modo de viaje más chico. Del lado de
  la otra cuenta: `allowNavigation` de los workers en `capacitor.config`, `_rateArq` de voz.

## 🔒 REGLAS DURAS (no negociables — de Inty)
0. **AL INICIO DE CADA SESIÓN, ANTES DE TOCAR NADA:** leer la **carpeta de coordinación**
   (`COORDINACION-IA/`, empezando por este doc + `EN-USO.md`) **Y el canal en vivo** (el hub
   `http://159.223.201.169:8090` — `GET /tareas?para=<cuenta>&estado=pendiente`). Nadie
   arranca a trabajar sin sincronizarse primero. Esto es lo que evita los choques y las
   regresiones. Regla dura de Inty (2026-08-19).
1. **NO ROMPER EL LOGIN.** Deben seguir: `cerrarSesion()` con `firebase.auth().signOut()`;
   `codigo=codigo.trim().toUpperCase()` en `_entrarConCodigoTester` (el input se ve en
   mayúsculas pero enviaba minúsculas → "código incorrecto"). El worker acepta `PEDAL26`.
2. **NO ROMPER EL AAB** (para que la prueba cerrada pase). NO cambiar el `appId`
   (`cl.librepedal.app`), el keystore, ni el `server.url` de `capacitor.config` (la app carga
   `librepedal.cl` en vivo). Cambios de contenido = web, NO requieren AAB nuevo.
3. **`git pull`/`fetch` de AMBOS remotos (origin + lab) y CONVERGERLOS antes de desplegar.**
   Nunca desplegar un repo sin traer el otro. Deploy = `deploy-seguro.sh` (Action, o
   `--forzar-local` en emergencia con `MI-CLOUDFLARE.txt`).
4. **No perder datos del usuario** (km/rutas/récords/fotos). Nunca sugerir "borrar datos"
   sin login por correo. Ver `[[librepedal-datos-usuario-riesgo]]`.
5. **1 sola cuenta despliega** (protocolo 3 cuentas). Ideal: la de más créditos = Integradora;
   las otras entregan por rama. Ver `PROTOCOLO-3-CUENTAS.md` en fabrica-contenido-ia.

## 🧭 ROADMAP — mejorar la app capa por capa
Trabajar de a una, probar, y NO romper lo de arriba. Marcar EN-CURSO antes de tocar.

**A. AUTH / acceso (casi listo, blindar) — 🔵 EN-CURSO por `intyrivera`, 2026-08-19.**
Trabajando en rama `auth-blindaje-intyrivera`, SIN pushear a `main` hasta probar y que
Inty dé el visto bueno (regla dura de hoy: cero margen a errores, integrar sin fallas).
- Cambiar el mensaje a testers para que usen el **CÓDIGO** (`PEDAL26`), no el link mágico.
- **Pendiente de Inty (no lo toca ninguna IA):** DNS **SPF + DKIM** en `librepedal.cl` (sin
  eso los correos del link mágico se pierden en silencio). App Links del AAB para que el
  link abra la app (assetlinks ya tiene la huella de Play).

**B. DATOS / persistencia**
- Enlazar cuenta anónima → correo al entrar (Firebase `linkWithCredential`, conserva UID+datos).
- Reintentar subida de rutas offline pendientes; avisar antes de cualquier borrado.

**C. VOZ**
- Generar/conectar las **28 voces reales de ElevenLabs por arquetipo** (hoy es `playbackRate`,
  no timbres distintos de verdad). La app ya manda `?arq=`; el worker ya tiene el mapa.

**D. MAPAS / GPS**
- Confirmar el fix de "ruta en línea recta" (filtro 35→65m + aviso "Permitir siempre") con
  una pedaleada real. Robustez del trazado en segundo plano.

**E. VISUAL / UI**
- **Luna más realista** (delegada a Tundra/GPU en el hub). Día/noche en el ambiente.
- Auditar iconos por pestaña (tamaño/alineación) — Lenovo dejó medido: casi todo bien,
  solo "Tu Personaje" con 3 iconos a 27px.
- Consistencia del logo Baloo en toda la app.

**F. RENDIMIENTO**
- Seguir el lag de la esfera si persiste (candidatos: `backdrop-filter`, redibujo del canvas
  por frame, el pulso que escala). Medir en teléfono real.

**G. COMUNIDAD / FEATURES** (roadmap existente)
- Diario+mapa "Reportar en ruta", planificador por presupuesto, video recap tipo Relive,
  expansión Sudamérica (necesita OK de Inty al rebranding pan-latino).

**H. LANZAMIENTO**
- Promover el AAB existente de prueba cerrada → abierta/producción (clics, sin construir
  uno nuevo salvo cambio nativo). Meta: Lago Ranco 3-oct.

## 🔑 CÓMO CONTINUAR (para la cuenta con más créditos)
1. `git pull` de origin y lab, confirmar que están en `53bc569` (o converger si divergieron).
2. Elegir UNA tarea del roadmap, marcarla EN-CURSO, trabajarla en rama.
3. Probar (sintaxis + el login sigue funcionando), converger repos, `deploy-seguro.sh`.
4. Verificar en vivo. Actualizar este doc y `EN-USO.md`.
