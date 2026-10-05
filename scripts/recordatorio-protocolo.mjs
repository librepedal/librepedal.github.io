// Hook UserPromptSubmit (.claude/settings.json): en CADA mensaje de Inty, deja a la vista de la
// sesión el resumen del PROTOCOLO OBLIGATORIO. Existe porque los protocolos estaban escritos pero
// no se cumplían: en conversaciones largas se pierden de vista (pedido de Inty, 2026-10-04).
// Lo que se imprime aquí se agrega como contexto del turno; no bloquea nada.
console.log([
  'PROTOCOLO OBLIGATORIO (COORDINACION-IA/PROTOCOLO-OBLIGATORIO.md) — cumplir en esta respuesta:',
  '1. Si no sabes algo: investiga primero (web, docs, código real). Nunca de memoria.',
  '2. Diseño: referencias reales primero, nivel diseñador senior, geometría real de Pistero, una pieza a la vez.',
  '3. Verifica tú mismo (render en grande y a tamaño real, tests, navegador) y corrige ANTES de mostrar.',
  '4. Nunca toques datos de producción al probar (db es const: window.db no lo intercepta).',
  '5. Honestidad: di qué no pudiste probar. Sin excusas, respuesta corta, nada a main sin el OK de Inty.'
].join('\n'));
