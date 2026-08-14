# 🔎 AUDITORÍA UX — Libre Pedal (v7.53) — plan de cierre

Auditoría de código + capturas reales de Inty (2026-07-29). Ordenado por **causa raíz** (arregla
varias pantallas de una vez), no por síntoma. Cada punto trae el **ancla de código** para arreglar
sin adivinar. **Regla:** cada arreglo se VE (captura) antes de cerrar — no cambiar a ciegas.

## 🔴 Causas raíz

### R1 · El mic y la burbuja de Pistero son GLOBALES flotantes
- `#micBtn` (~línea 628, CSS ~472, `bottom:80px`, morado) = mic hands-free global (feature intencional:
  hablar por voz mientras ruedas) pero **mal posicionado → tapa contenido** en Perfil (casco), Social/
  Comunidad (enviar mensaje), etc.
- `#pisteroBubble` (~línea 634) = burbuja de respuesta **también global** → se filtra a otras pantallas
  (ej. la respuesta "ingresaste un 0" encima de Social).
- **Fix:** (a) el mic = **cara de Pistero** (no mic genérico); (b) que **no tape** — dar `padding-bottom`
  a las vistas scrolleables o reposicionar/encoger; (c) la **respuesta contenida** (scroll dentro de
  `#pisteroMsgs`), nunca encima de otra pantalla.

### R2 · Mapa: controles DUPLICADOS y apilados
- maplibre agrega Navigation (zoom+brújula ~4671), Fullscreen (~4672), Geolocate (círculo azul ~4676).
  La app agrega ADEMÁS `btnCapaMapa` (🏔️ ~997), `fabReportar` (➕ ~998), `map-recenter-btn` (crosshair ~999).
- **Duplicado real:** Geolocate (azul) + map-recenter-btn = ambos ubican → **dejar UNO**.
- **Fix:** un solo stack limpio, iconos chicos espaciados, quitar el duplicado, y agregar botón
  **"buscar ciclistas"** (la función que se perdió al ocultar las capas).

## 🟠 Por pantalla
- **MAPA:** aplicar R2 · texto del card ya corregido (v7.53) · dejar claro **iniciar viaje / multiviaje**.
- **PISTERO:** el **teclado tapa el input** al escribir → manejar `visualViewport`/`scrollIntoView` del
  `#pisteroInput` (~1108); respuesta contenida en `#pisteroMsgs` (~1106); mic = cara.
- **SOCIAL:** "Amigos y mensajes" + "Solicitudes" + "Buscar ciclistas" → **UN desplegable** que muestre
  las **notificaciones**.
- **PERFIL:** skins/accesorios en fila con scroll horizontal → **desplegables por categoría**
  (`selectHelmet`/`selectSkin`/`selectPeinado`/... ~2710+, `#tabsPersonalizar`).
- **VOCES:** integrar las **voces clonadas** (Chatterbox) — ver memoria [[voice-service-rtx]].

## Método de cierre (para no romper)
Por causa raíz, en tandas, **viendo cada tanda** (captura) antes de pasar a la siguiente. R1 primero
(cura mic-que-tapa + diálogo-que-se-filtra), luego R2, luego Social, Perfil, y por último las voces.

— Auditoría: sesión Thunderobot, 2026-07-29.
