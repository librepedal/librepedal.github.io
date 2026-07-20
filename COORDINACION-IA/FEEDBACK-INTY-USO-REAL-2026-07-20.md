# 🗣️ Feedback de Inty en uso real — 2026-07-20 (sesión "Capone/Thunderobot")

> Capturado textual por otra sesión de Claude a partir de un chat de WhatsApp donde
> Inty probó la app v7.x en la calle. **Inty avisó explícito: "si algo queda mal me
> voy a molestar demasiado, por algo estoy dando el feedback."** Tratar cada punto como
> requisito, no como sugerencia. Principio rector de Inty: **menos es más, entre más
> simple mejor, reubicar cada cosa donde corresponde, asociarla con lo que representa,
> NO confundir al usuario.**

---

## 🔴 PRIORIDAD MÁXIMA — El Taller / "Arregla mi bici"
Palabras de Inty: **"EL TALLER ES UNA BASURA, los tips de arreglos son un chiste. Si no
hay especificación técnica de un paso a paso REAL, mejor no poner nada."**

- El "taller Mciver" / arreglos están **demasiado básicos y genéricos**.
- Regla dura: **o hay un paso a paso técnico REAL (herramientas, pasos, torque en Nm,
  advertencias de seguridad), o NO se pone nada.** Un tip genérico de IA es peor que vacío.
- Ver más abajo la asesoría experta con el enfoque correcto y fuentes (Park Tool).

---

## 1. Grabación / GPS
- El botón **"Iniciar GPS" está escondido y es redundante**: la app ya pide GPS+micrófono
  desde que abre y dice "estoy grabando tu ruta". Si existe un control para el GPS, debe
  estar **a la vista**, no enterrado. Aclarar qué significa cada estado (grabando vs no).

## 2. Mapa
- Los mapas se **guardan todos juntos = muy mal**. Inty quiere que el mapa general se vaya
  **desbloqueando como un videojuego** a medida que el ciclista pasa por la zona, **dividido
  en sectores** según dónde ande.
- El **"mapa negro"** se ve elegante pero **no aplica la descripción de "mapa libre"** →
  ¿se puede quitar / reconciliar el estilo con lo que promete?

## 3. Reportes / capas del mapa
- Botones **"Peligros" y "Controles" NO HACEN NADA** (muertos).
- "Servicios" y "Miradores" son botones de reportar.
- El **botón de reportar es gigante**: tapa otros accesos, el **punto GPS del usuario está
  duplicado**, y **tapa las capas del mapa**. Queda encima del contenido (un cerro). Hay que
  achicarlo/reubicarlo y separar "reportar" de "capas" y del punto GPS.

## 4. Social — demasiados botones sueltos
Hoy: Invita a un amigo · Amigos y mensajes · Solicitudes · Recomendaciones · Buscar ciclistas ·
Te doy alojo · Rodadas grupales · Novedades del ciclismo en Chile · Chat global.
- **"Solicitudes" y "Amigos" deben ir en el MISMO botón** (ahorrar espacio).
- Agrupar el resto por afinidad (menos es más).

## 5. Pistero (copiloto IA)
- El **comentario detrás del micrófono se REPITE mucho** → debe ser **aleatorio**, sin
  monotonía. (Nota: la otra sesión ya subió a 364 frases por arquetipo en v7.18 — verificar
  que efectivamente rota y no repite en uso real.)
- El **micrófono se siente invasivo**: la app parece escuchar todo el tiempo. A Inty le
  agrada que Pistero hable, pero no tiene claro cuál es la mejor forma de exponer el mic
  (activable claro vs siempre escuchando). Necesita definición de UX.
- **Las voces suenan igual FONÉTICAMENTE** — que digan frases distintas no basta; la
  diferencia entre arquetipos debe oírse (timbre/voz), no solo el texto.

## 6. Perfil y personaje
- Los **accesorios y skins deben desplegarse al tocar** (progressive disclosure): tocar
  "casco" → se despliegan los cascos; igual para colores, lentes, etc. Los **arquetipos van
  ABAJO** del recuadro. Ahorrar espacio.
- El recuadro donde "se encierra" Pistero debería contener todos los accesorios/skins.

## 7. Ajustes
- Muchos toggles juntos: Voz ON · Voz mejorada ON · Guía: Pistero · Ahorro pantalla ·
  Ahorro GPS OFF · Compartir ubicación en vivo · Ver tutorial · El idioma de la ruta ·
  Manos libres. Revisar cuáles son preferencias (se autoguardan) vs acciones, y agrupar.

---

## 🧰 ASESORÍA EXPERTA — cómo debe ser el Taller (Inty pidió "asesoría de un experto")

**Diagnóstico:** una app de ciclismo NO debe dejar que un LLM improvise pasos de reparación.
Es un dominio de **seguridad** (frenos, dirección, horquilla, torque en carbono): un paso
mal escrito puede lesionar al usuario o destruir el componente. La reparación de bicis es un
dominio **ya resuelto y estandarizado** — hay autoridades y specs reales.

**Dos caminos correctos (elegir uno, o combinarlos):**

**A) Guías reales curadas (poquitas, pero de verdad).** Un set chico de arreglos comunes,
cada uno con: *herramientas necesarias · paso a paso numerado · torque en Nm · advertencia de
seguridad · cuándo NO seguir y llevarlo al mecánico.* Contenido nivel **Park Tool "Big Blue
Book"** (Calvin Jones), no inventado. Ej. de arreglos aptos para DIY: pinchazo/cámara,
ajuste de frenos de zapata, lubricar cadena, ajuste de cambios (indexado), apretar bielas al
torque correcto. **Cada guía cita su fuente.**

**B) Triage + derivación (más seguro y más simple, "menos es más").** En vez de enseñar, el
Taller **pregunta el síntoma** ("¿qué te pasa?") → da un diagnóstico corto → enlaza a la guía
real (Park Tool) → y ofrece **"taller cercano"** (directorio real, ej. Mciver) para lo que no
es DIY. Los arreglos de seguridad (frenos/dirección/horquilla) SIEMPRE derivan a mecánico.

**Regla de oro (la de Inty):** si un tip no tiene paso a paso técnico real y verificable,
**no se muestra.** Mejor "esto lo ve un mecánico + taller cercano" que un consejo genérico.

**Fuentes:** Park Tool Repair Help y el Big Blue Book of Bicycle Repair (Calvin Jones) son la
referencia estándar de la industria; el torque se mide en Nm y respetarlo es crítico
(sub/sobreapriete = falla o daño, sobre todo en carbono).

---

## Cómo seguir
- Puntos 1–7: entran al reparto normal del reorg (varios ya en curso por la otra sesión).
- El **Taller** necesita decisión de Inty entre camino A (guías curadas) y camino B (triage
  + derivación). Recomendación: **B primero** (simple y seguro) y sumar guías A de a poco.
- Nada de esto se aplicó desde esta sesión: solo se guardó el feedback para no perderlo.
