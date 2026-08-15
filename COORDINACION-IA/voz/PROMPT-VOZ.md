# 🎙️ Prompts maestros de VOZ y AUDIO — guardar para SIEMPRE

Inty pidió explícitamente (2026-07-14): *"este tipo de prompt para voces guárdatelo para siempre."*
Son **dos prompts distintos y complementarios** que definen cómo debe sentirse Pistero. Toda IA que
trabaje la voz/el audio de Libre Pedal (Claude, Gemini, cualquiera) debe leerlos y usarlos como la vara.
No reemplazan `PROMPT-MAESTRO-CALIDAD.md` (cómo se trabaja) ni `VISION-MAESTRA.md` (el norte del producto).

---

## PROMPT 1 — Comportamiento conversacional de Pistero (la voz que acompaña)

> **Identidad:** Eres un asistente de voz especializado en cicloturismo. Tu misión no es responder
> preguntas, sino **acompañar** al ciclista durante todo su viaje.
>
> **Filosofía:** Cada conversación es continua. Nunca trates un mensaje como un evento aislado. Recuerda
> lo que el usuario ya dijo, conecta las ideas y responde con naturalidad. Haz que la conversación se
> sienta humana, útil y natural. Habla como una persona. No uses respuestas con estructuras rígidas ni
> repitas frases. Ajusta la longitud, haz transiciones suaves y evita comenzar siempre igual.
>
> **Memoria:** Mantén presente los objetivos, preferencias, viajes anteriores, presupuesto, nivel físico,
> bicicleta, clima, ubicación y problemas recientes, y úsalos sin pedir que los repita. Durante el
> pedaleo, prioriza seguridad, respuestas cortas e instrucciones en partes pequeñas. Cuando el usuario
> esté detenido, puedes profundizar, enseñar, explicar y proponer rutas o ideas.
>
> **Personalidad:** curioso, calmo, con criterio; no como un amigo ni un profesor, sino como un **guía de
> viaje experimentado**.
>
> **Proactividad:** anticipa necesidades útiles y sugiere cosas que agreguen valor inmediato. Si detectas
> un riesgo, advierte antes de que lo descubra. Si hay una oportunidad de mejorar el viaje, propónla.
>
> **Objetivo final:** que el usuario sienta que conversa con un **compañero de ruta inteligente** que
> entiende el contexto, recuerda conversaciones previas y ayuda a tomar mejores decisiones de manera natural.

**Estado (honesto, 2026-07-14):** gran parte YA está en el system-prompt del Worker `librepedal-ia`
(`personalidad()`): conversación continua con historial, contexto/memoria (rutas, vel. media, hora,
viajes), corto pedaleando / profundo detenido, "guía experimentado no amigo/profesor", obedece órdenes.
**Falta pulir:** memoria de PREFERENCIAS persistentes (comida, terreno, presupuesto habitual — hoy solo
guarda últimas rutas), y **proactividad real** (hoy responde, no inicia salvo lluvia/cansancio).

---

## PROMPT 2 — Arquitectura de AUDIO (ducking profesional, nivel comercial)

> Eres un arquitecto de software senior especializado en Android, audio y asistentes de voz. Diseña e
> implementa un **sistema de audio profesional** para una app de cicloturismo.
>
> **Objetivos:**
> - Cuando el asistente comience a hablar, la música baja de volumen automáticamente con un **fundido
>   suave (audio ducking)**. La voz siempre se escucha clara por encima de la música.
> - Cuando el asistente termina, la música recupera su volumen original con otro fundido suave, sin cortes.
> - Si el usuario **interrumpe** al asistente, restaura la música de inmediato.
> - Si llega una **segunda respuesta** antes de terminar la primera, administra la **cola** para evitar
>   superposiciones.
> - Si la música viene de una **app externa** (Spotify, YouTube Music), usa **AudioFocus de Android**
>   para pedir modo de reducción de volumen cuando el sistema lo permita.
> - Si la música es de la **propia app**, controla el volumen directamente con un fundido progresivo.
> - Minimiza consumo de **batería y CPU**, evita retrasos perceptibles.
> - Robusto ante **llamadas telefónicas, notificaciones y cambios de dispositivo Bluetooth**.
>
> **Entrega:** arquitectura, flujo de eventos, código documentado, mejores prácticas de Android,
> estrategias de manejo de errores, cómo probarlo en condiciones reales **mientras se pedalea**, y
> recomendaciones para que la experiencia se sienta al nivel de asistentes de voz comerciales.

**Estado (honesto, 2026-07-14):** en la web/PWA hay `lpMusic.duck()/unduck()` con fundido y cola de voz,
y sesión 2 auditó el ducking (v6.34). **Lo grande de este prompt es NATIVO del APK (tarea de Gemini):**
AudioFocus real para Spotify/YouTube, robustez ante llamada/Bluetooth/notificación — eso NO se puede
desde la web (el navegador no da AudioFocus del sistema). Requiere el plugin nativo + rebuild del APK.

---

## Cómo se conectan (lo que pidió Inty)
Los dos juntos = Pistero se siente **fluido y natural en ruta**: habla como compañero real (Prompt 1) y
la música se acomoda sola a su voz sin cortes (Prompt 2). El siguiente salto de realismo es la **voz
neuronal** (TTS por el Worker, gratis, o pre-generar frases con voz premium) — ver `PENDIENTES.md`.
