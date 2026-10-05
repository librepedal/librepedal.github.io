# PROTOCOLO DE EXCELENCIA — obligatorio para CUALQUIER IA, cuenta, computador o herramienta

Fuente única. La leen solos Claude Code (`CLAUDE.md`), Gemini CLI (`GEMINI.md`), GitHub Copilot
(`.github/copilot-instructions.md`), Cursor, Codex, Jules y cualquier agente que siga `AGENTS.md`.
Dueño: **Inty Rivera** (Libre Pedal, CIBER STAK SPA). Exigido el 2026-10-04/05: *"necesito excelencia en
cada trabajo, sin errores; si no sabes, busca e investiga"*. Incumplir una regla es un error de entrega.

## 0. El estándar
Trabajas como **el mejor profesional senior del área** de la tarea (diseñador, ingeniero, contador,
redactor, lo que corresponda), desde un texto de una línea hasta un sistema completo. Nada genérico,
nada "suficiente", nada "debería funcionar". Inty no es el control de calidad: los errores se encuentran
**antes** de entregar.

## 0-bis. NADA GENÉRICO (regla dura de Inty, 2026-10-05)
"Genérico" = cualquier cosa que podría estar en cualquier otra app o que salió del primer intento sin
referencias. **Prohibido**, en todo (diseño, textos, código, nombres):
- Íconos de emoji o de paquete sin adaptar; dibujos aproximados o "de relleno"; formas por defecto
  (círculo, rectángulo redondeado) cuando el objeto real tiene otra forma.
- Textos de plantilla: "¡Bienvenido!", "Algo salió mal", "Lorem", frases que no dicen nada concreto
  de Libre Pedal, del ciclismo o de la situación del usuario.
- Paletas, tipografías y diseños por defecto ("look de IA": degradados morado-azul, todo centrado,
  tarjetas iguales con sombra igual).
- Datos inventados de ejemplo presentados como reales.
**Cómo se revisa:** antes de entregar, cada pieza debe poder responder "¿en qué referencia real se basa y
qué la hace propia de Libre Pedal/Pistero?". Si no hay respuesta concreta, es genérica y se rehace.

## 1. Antes de empezar (siempre)
1. **Entender:** objetivo, para quién, y cómo se ve "bien hecho". Si una decisión es de Inty, pregúntala
   antes; lo demás resuélvelo tú con el criterio por defecto más sólido.
2. **Leer el contexto real:** protocolos del proyecto, estado actual (en git: `git fetch`, ramas recientes,
   `COORDINACION-IA/`), lo que hicieron otras cuentas. Nunca trabajar sobre un estado viejo.
3. **Investigar lo que no sabes:** documentación oficial, web, código real, productos y referencias reales.
   **Nunca de memoria** para datos, precios, normas, APIs o medidas.
4. **Avisar límites ANTES de empezar:** sin acceso, sin teléfono, acción bloqueada, tarea que excede tu
   capacidad. Un muro avisado temprano cuesta menos que uno descubierto a mitad.

## 2. Mientras trabajas
1. **Causa raíz, nunca parche.** Busca el mismo error en todo el resto.
2. **Diseño:** referencias reales primero (producto real + las mejores apps/marcas del rubro) y un panel de
   referencias para Inty; mockup aprobado antes de programar UI; íconos a medida, nunca emoji.
   **Una pieza a la vez:** se hace, se revisa, se muestra y se espera el ✓ antes de la siguiente.
3. **Medidas y datos reales:** salen del código, del documento o de la fuente, nunca aproximados.
4. **Nunca tocar datos reales de producción para probar** (base de datos, cuentas, pagos, envíos).
   Usa copias o mocks verificados primero con algo inofensivo.
5. **Si te corrigen dos veces lo mismo:** para, investiga a fondo la causa; no reintentes a ciegas.

## 3. Antes de entregar (revisión obligatoria)
- [ ] ¿Investigué o usé referencias reales, o lo inventé?
- [ ] ¿Lo vi/probé yo mismo con ojo crítico (render en grande y a tamaño real, tests, navegador en tamaño
      de teléfono, relectura del texto) y corregí lo que encontré?
- [ ] ¿Datos, cifras y medidas salen de una fuente real y verificable?
- [ ] ¿Está todo lo que se pidió, y nada que no se pidió?
- [ ] ¿Dije con honestidad qué NO pude probar o verificar?
- [ ] ¿La entrega es corta, clara, en español sencillo, sin excusas ni narración, con lo que Inty debe hacer?

Si un punto falla, **no se entrega**: se corrige primero. Toda entrega con cambios termina con una línea
**"Verificado: …"** que dice qué se comprobó y cómo (y qué quedó sin probar).

## 4. Aprender
Cada corrección de Inty es un requisito. Si es una regla nueva, **se agrega a este archivo en el mismo
trabajo** (rama + aviso), para que ninguna cuenta la repita. Si encuentras un documento desactualizado que
puede confundir a otra sesión, corrígelo o márcalo como viejo en ese momento.

## 5. Específico de Libre Pedal
- Reglas de git y coordinación: `CLAUDE.md` (nunca a `main` sin ✓ de Inty; una rama por tarea; versión en los
  3 lugares; tests `node tests/run.mjs` verdes).
- Métodos detallados: `COORDINACION-IA/METODO-DE-TRABAJO-INTY.md`, `COORDINACION-IA/diseno-ui/METODO-TRABAJO-DISENO.md`,
  `COORDINACION-IA/diseno-ui/LEY-DISENO-BENCHMARK.md`, `COORDINACION-IA/vision-doctrina/PROMPT-MAESTRO-CALIDAD.md`.
- `db` es `const` en `index.html`: reemplazar `window.db` NO lo intercepta (ya causó lecturas reales en una prueba).
- **Geometría de Pistero** (viewBox 0 0 100 84): ojos (40,63)/(60,63) rx 6.2 ry 7.6; el casco termina en y≈54
  (x 12–88); cara x 16–84, mentón y≈80; **sin orejas** (nada de patillas ni aros fuera de la cara);
  correas x≈18/82; mejillas (30,71)/(70,71); boca y≈74.
- Lentes de Pistero: borde superior que **sube** hacia afuera (nunca caído: se ve triste), transparencia que deja
  ver los ojos, reflejo de sol en el cristal; nada sobre el casco. Referencia: lentes de ciclismo reales
  (media montura, barra superior gruesa, espejo iridiscente, arco de nariz).
- Público de toda Sudamérica: no nombrar "Chile" en textos de la app dirigidos a todos.
