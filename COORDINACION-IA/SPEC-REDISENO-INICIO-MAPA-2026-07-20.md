# 🧱 SPEC de implementación — Inicio + Mapa/Viaje (APROBADO por Inty)

**Fecha:** 2026-07-20 · **Origen:** sesión Claude "Capone/Thunderobot" (diseño con Inty, pantalla por pantalla).
**Estado:** Inty **aprobó los mockups** y dijo "aplica". Esto es la orden de construcción. Complementa
`FEEDBACK-INTY-USO-REAL-2026-07-20.md` (sus quejas de uso real). Aplica todo el protocolo de `LEEME.md`
(candado EN-USO, subir versión en 3 lugares, `node --check`, probar en navegador, commit+push+deploy+bitácora,
NO romper la lista PROTEGIDO).

**⚠️ Antes de empezar:** al 20-jul había cambios **sin commitear** en `index.html` con el candado en LIBRE.
Commitea/reconcilia ESO primero para no perderlo, luego toma el candado y aplica este spec.

**Referencia visual (mockups aprobados, abrir para ver el detalle exacto):**
- Inicio: https://claude.ai/code/artifact/d5d785fc-3f97-4015-823e-af745f540822
- Mapa (3 momentos): https://claude.ai/code/artifact/6814c8d2-8781-4dc0-8a53-48f16fb2878c
- Elegir modo (animado): https://claude.ai/code/artifact/c7b31273-0e54-44e0-b86c-5d3862e00b07
- Reportar + Sobrevuelo (animado): https://claude.ai/code/artifact/203f9177-9d7d-4993-bc9d-925371175e59

**Regla transversal de Inty:** menos es más; asociar cada cosa con lo que representa; **iconos a medida, NO
genéricos** (bici estilo Lucide, huellas para senderismo, auto para motorizado — el de moto NO va).

---

## PANTALLA 1 — Inicio / Registro / Ingreso

- **Logo animado:** rueda de **radios finos** girando en **naranjo** (spokes ~#e08a4a), con **relieve leve** (tread
  sutil en la goma). El **logo oficial** `logo-transparent.png` (ya está en el repo, raíz) va **al centro, grande
  (~50% del diámetro), sin tapar los rayos** (los radios arrancan por fuera del logo). El logo queda quieto y
  legible mientras la rueda gira. **NO** poner borde naranja por fuera de la rueda.
- Debajo: wordmark "LIBRE PEDAL" + tagline corta.
- **Interruptor** Ingresar / Crear cuenta (una pantalla, dos modos).
- **Campos (solo esto):** nombre, correo, contraseña, sexo (Hombre/Mujer/Prefiero no decir).
- **País NO va aquí** → se elige después en **Preferencias**.
- **El modo de viaje NO va aquí** (ver pantalla 2).
- **Pie de comunidad** (con su espacio): enlace **librepedal.cl**, **Quiénes somos**, y **Síguenos** con iconos de
  Instagram · TikTok · YouTube · Facebook. Texto "Síguenos y súmate a la comunidad".
- CTA: "Crear cuenta y pedalear".

## PANTALLA 2 — Mapa / Viaje (EL CENTRO: aquí sucede todo, con botones desplegables)

### 2a. Iniciar viaje
- **Selector de modo** (Bicicleta · Senderismo · Motorizado) con iconos a medida. Al **elegir uno**, los 3 iconos
  **se repliegan con animación** y dan paso a los **controles del viaje**; queda un chip "Vas en X · Cambiar". En un
  **viaje nuevo**, los 3 modos vuelven a aparecer. El modo ajusta cómo habla/avisa Pistero.
- **Controles del viaje** que aparecen tras elegir (propuestos, confirmar con Inty): **Mi ubicación · Reportar por
  voz · Ruta alternativa**. **Música NO va aquí.**
- **Multidestino:** se agregan paradas con "＋". Si queda **una sola**, es un destino simple (automático).
- **Pistero de pre-vuelo:** "Revisá la bici · [clima real, ej. 12° nublado] · ¡A rodar!" (reemplaza el viejo "Voy
  contigo" que sobraba).
- **Configurar el viaje por VOZ:** la app tiene IA → armar el viaje hablando ("Pistero, llévame a Chihuío y avísame
  los controles"). **Pistero lo ofrece como RECOMENDACIÓN** para que la gente se acostumbre a hablarle. **Opcional,
  nunca obligatorio.** Dejar como opción predefinida/ofrecida.
- CTA: "Comenzar viaje". **El GPS/rastreo/mic arranca SOLO al tocar Comenzar** — NO al abrir la app (queja real de
  Inty: la app pedía GPS/mic y "grababa" desde el inicio).

### 2b. Rodando
- **Mapa libre** (el usuario puede moverse/explorar).
- **Botón "Mi ubicación"** que recentra el mapa directo a donde está el usuario.
- **Reportar = botón que se despliega:** al **marcar un punto** en el mapa, se abre una **baraja/abanico ANIMADO**
  (escalonado) con **Peligro · Control · Servicio · Mirador**. No tapa el mapa; se cierra sola si no se elige.
- **Reportar POR VOZ (prioridad de seguridad):** pedaleando NO se saca el teléfono. Decir "Pistero, control" /
  "peligro adelante" marca el evento con las manos en el manubrio. Debe estar bien visible.
- **Aviso según velocidad:** Pistero avisa un evento con **más anticipación si el usuario va más rápido** (la
  distancia del "a 300 m" se calcula por la velocidad real, no fija).
- HUD de velocidad.

### 2c. Fin de ruta
- Al terminar, **Pistero pregunta: "¿guardo tu ruta?"** y ofrece **"Ver el sobrevuelo de mi viaje"**.
- **Sobrevuelo (flyover):** muestra la ruta y el **icono de bicicleta RECORRIÉNDOLA** (avanza por el trazado). Se
  adapta al modo (senderista/motorizado si fue otro). Botones: Ver sobrevuelo · Guardar ruta · Descartar.

---

## Notas de implementación
- Reutilizar la infra existente (MapLibre, `toggleGPS`, `lpBackgroundGeo`, voz de Pistero, worker IA). NO romper
  PROTEGIDO (rastreo pantalla apagada, anti-recálculo, pausa manual, variantes fonéticas, chat Pistero, video 3D).
- Iconos SVG a medida (los del mockup): bici (wheels+frame+seat dot estilo Lucide), huellas (footprints) para
  senderismo, auto para motorizado.
- El "sobrevuelo con bici" puede usar SVG `animateMotion` + `<mpath>` sobre el trazado de la ruta.
- Subir versión (v7.2x), un commit por bloque, deploy web (wrangler, carpeta limpia) + push (APK). Bitácora con
  evidencia.
- Cuando esté, avisar a Inty para que lo pruebe en el teléfono.
