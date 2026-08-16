# 🧭 MÉTODO DE TRABAJO — diseño antes de código

**Acordado con Inty el 2026-07-20.** Vale para TODAS las sesiones (cualquier modelo) que toquen interfaz de
Libre Pedal — o cualquier app de Inty. Va POR ENCIMA del protocolo técnico de `LEEME.md`/`EN-USO.md` (que sigue
vigente para el código): esto es CÓMO se decide qué construir, antes de escribir una línea.

---

## 🚦 La regla de oro (la que faltaba y causaba el retrabajo)

**Nada de UI/rediseño se codea antes de que Inty apruebe un MOCKUP VISUAL.**

Inty decide por **cómo se ve**. Antes, se codeaba primero y él rechazaba el resultado → se rehacía una y otra vez
("no sé cuántas auditorías te he mandado y aún hay problemas"). El gate de **diseño aprobado** corta eso. Es
literalmente el gate #2 del ciclo de una empresa grande (descubrir → **diseñar/aprobar** → construir → QA →
release por etapas → monitorear).

## 🎨 Cómo se produce el diseño (flujo del mockup)

1. **Un mockup por pantalla, como Artifact** (página HTML en claude.ai/code/artifact), no texto.
2. En la **estética real** de la app: oscuro (#0c0f14), acento naranja (#ff6a2b), teal/azul secundarios, tipografía
   del sistema, y el **logo oficial `logo-transparent.png`** (ya en el repo) cuando corresponde.
3. **Si es una interacción, se ANIMA** (CSS/JS o SVG `animateMotion`) para que Inty la vea moverse — él lo pide.
4. Cada mockup lleva, al lado, las **decisiones** (qué se elimina / mantiene / mueve y por qué).
5. Se **itera pantalla por pantalla**: Inty da "dale" o "cámbiame esto"; se ajusta y se republica el MISMO artifact
   (misma URL). Recién con su ✓ se escribe el **SPEC** (orden para la sesión de código) — ver `SPEC-REDISENO-*.md`.

## 📐 Canon de UX que se aplica (no es opinión, es estándar)

- **Menos es más** — Ley de Hick: menos opciones visibles = decisión más rápida → **una acción primaria por
  pantalla**.
- **Agrupar / trocear** — Ley de Miller 7±2: 3 grupos de 3 > lista de 10.
- **Divulgación progresiva** (Nielsen): mostrar lo esencial, esconder lo avanzado tras desplegables/"más".
- **Mapeo y significantes** (Norman): cada botón se ve como lo que hace; un botón que no responde es **peor** que no
  tenerlo.
- **Iconos A MEDIDA, NUNCA genéricos** (regla dura de Inty). Nada de emoji como iconos de UI. Bici estilo Lucide,
  huellas para senderismo, auto para motorizado, etc.
- Reubicar cada cosa donde el usuario la espera; asociar todo con lo que representa; **no confundir**.

## 🧩 El estilo de Inty (para trabajarle bien)

- Es **muy particular** y **itera rápido**; cuando da feedback, es **requisito**, no sugerencia ("si algo queda mal
  me molesto, por algo doy el feedback").
- **Odia el retrabajo y el esfuerzo malgastado** — por eso el gate de diseño y no duplicar lo que otra sesión ya
  hace.
- Responde a lo **visual**: mostrarle imágenes/animaciones, no párrafos.
- Exige **honestidad**: si algo no se puede probar o hay un riesgo, se dice; no "debería funcionar".
- Pide **calidad de servicio real**: guiar y ofrecer alternativas, no esperar que él resuelva.
- Contenido sensible/seguridad (ej. el **Taller**): o hay paso a paso técnico real (nivel Park Tool, con torque en
  Nm) o **no se pone nada**. Nunca tips improvisados por IA.

## 🔗 Cómo encaja con el protocolo técnico

- Este método define **qué** y **cómo se ve**. `LEEME.md` define **cómo se codea sin romperse** (candado EN-USO,
  versión en 3 lugares, `node --check`, tests, deploy web + push APK, bitácora, lista PROTEGIDO). Se usan juntos.
- Puente diseño→código: los archivos **`FEEDBACK-INTY-USO-REAL-*.md`** (sus quejas) y **`SPEC-REDISENO-*.md`**
  (la orden aprobada, con links a los mockups). La sesión de código construye desde ahí.
- Coordinación entre cuentas: igual que siempre — leer EN-USO antes de tocar `index.html`, ediciones chicas, no
  pisar el trabajo del otro.

**En una frase:** mockup animado → ✓ de Inty → SPEC en el canal → la sesión de código lo construye con el protocolo.
Ver también `PROPUESTA-REORGANIZACION.md` (misma filosofía).
