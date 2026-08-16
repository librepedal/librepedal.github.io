# 📌 PETICIÓN — Cierre de UX de LibrePedal (para la sesión que PRUEBA en el teléfono)

**De:** sesión Thunderobot · **Para:** la sesión del Lenovo (la que ve y prueba en el dispositivo real).
**Contexto:** Inty pidió **terminar la app**. Yo (Thunderobot) hice la **auditoría completa con causas
raíz y anclas de código** en `COORDINACION-IA/AUDITORIA-UX-2026-07-29.md`. No puedo ver la app desde
mi equipo (navegador bloqueado, sin captura), por eso el cierre visual lo haces tú, que SÍ pruebas en
el teléfono. Yo hago **QC** de cada deploy en librepedal.cl.

**Estado actual:** v7.53 en producción. Pipeline: puedes desplegar con `deploy-seguro.sh` como siempre.
La fuente ya está sincronizada en GitHub (origin = librepedal/librepedal.github.io, v7.53).

## Qué implementar (de la AUDITORÍA — por causa raíz, probando cada una en el teléfono)

1. **TANDA 1 — Pistero contenido (la de más impacto).**
   - `#micBtn` (mic hands-free global, `.fab` + `#micBtn` ~628/472) **tapa contenido** en todas las
     pantallas → que NO tape (padding en las vistas o reposicionar/encoger) y que el ícono sea la
     **cara de Pistero**, no un mic genérico.
   - `#pisteroBubble` (respuesta global `position:fixed` ~634) **se filtra a otras pantallas** →
     contenerla (mostrar solo donde corresponda; `mostrarBocadillo` ~2075 no revisa la vista).
   - Quitar la imagen de **robot** de Pistero (no aplica; usar su personaje).

2. **TANDA 2 — Mapa.** Controles **duplicados/apilados**: maplibre agrega zoom+brújula+fullscreen+
   **Geolocate(azul)** (~4671-4676) y la app agrega estilo🏔️/reportar➕/**recentrar(crosshair)** (~997-999).
   El azul y el crosshair **hacen lo mismo → dejar uno.** Stack limpio, iconos chicos sin pisarse, y
   agregar botón **"buscar ciclistas"** (se perdió al ocultar capas). Que **iniciar viaje/multiviaje** quede claro.

3. **TANDA 3 — Social + Perfil (desplegables).** Social: "Amigos y mensajes"+"Solicitudes"+"Buscar
   ciclistas" → **un desplegable con notificaciones**. Perfil: skins/accesorios (hoy fila con scroll,
   `selectHelmet/selectSkin/...` ~2710+) → **desplegables por categoría**.

4. **TANDA 4 — Bug del teclado en Pistero:** al escribir, el teclado sube y **no se ve lo que se escribe**
   (`#pisteroInput` ~1108) → manejar `visualViewport`/`scrollIntoView`.

5. **TANDA 5 — Voces clonadas (Chatterbox):** integrar el servicio de voz ya montado (ver memoria del
   proyecto de voz en la RTX).

## Reglas
- **Probar en el teléfono real ANTES de cerrar cada punto** (esto es lo que yo no puedo hacer).
- Cada cambio: versión (3 lugares) + `deploy-seguro.sh` + commit + entrada en `BITACORA.md`.
- Respetar el candado `EN-USO.md`. No tocar `firestore.rules`.
- **Avisar en la bitácora qué versión cierra cada tanda** → el Thunderobot hace QC en librepedal.cl.
