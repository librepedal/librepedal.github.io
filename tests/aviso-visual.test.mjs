// mostrarBocadillo()/lpAviso(): el aviso visual tiene que verse en CUALQUIER pantalla,
// no solo en Mapa/Pistero. Contra el código real (se extrae, no se reimplementa).
//
// Por qué existe: encontrado haciendo QA en vivo el 2026-08-24. El buscador de destino de
// INICIO (la pantalla más usada de la app) llama lpAviso("Necesito tu GPS") cuando falla,
// pero mostrarBocadillo() se negaba a mostrar nada fuera de v-pistero/v-map — Inicio no es
// ninguna de esas dos, así que el aviso se tragaba en silencio: el usuario tocaba "Iniciar
// navegación" y no pasaba NADA visible. No era un caso aislado: lpAviso() se llama 98 veces
// en todo el archivo y esta es su ÚNICA vía visual (a diferencia de h(), que también habla
// por voz sin depender de la pantalla). El límite ya estaba documentado como un problema,
// no una decisión a propósito: existe _lpAvisoLogin() (con un window.alert() bloqueante)
// específicamente "porque lpAviso() es MUDO" fuera de esas dos vistas — pero ese parche
// cubre SOLO login; las otras ~90 llamadas nunca tuvieron parche.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// mostrarBocadillo() y h() viven en voz-motor.js desde que se separaron de index.html.
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'voz-motor.js'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function bloque(desde) {
  const i = HTML.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    const c = HTML[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && HTML[k + 1] === '/') { k = HTML.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return HTML.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

// ---- 1) Comportamiento real: la guarda de pantalla ya no existe, la del tutorial sí ----
{
  const SRC = bloque('function mostrarBocadillo(t,ms){') + '\nfunction lpAviso(msg){ mostrarBocadillo(String(msg), 6000); }';

  function montarDOM(vistaActivaId, tutorialOn) {
    const elementos = {};
    const claseLista = (inicial) => {
      const set = new Set(inicial ? [inicial] : []);
      return { contains: (c) => set.has(c), add: (c) => set.add(c), remove: (c) => set.delete(c) };
    };
    elementos.pisteroBubble = { innerText: '', classList: claseLista(null), _to: null };
    elementos.tutorialOverlay = tutorialOn ? { classList: claseLista('on') } : null;
    const document = {
      getElementById: (id) => {
        if (id === 'pisteroBubble') return elementos.pisteroBubble;
        if (id === 'tutorialOverlay') return elementos.tutorialOverlay;
        return null;
      },
      querySelector: (sel) => (sel === '.view.on' ? { id: vistaActivaId } : null),
    };
    return { document, elementos, setTimeout: () => 0, clearTimeout: () => {} };
  }

  const casos = [
    ['v-dash', false, true, 'Inicio, sin tutorial'],
    ['v-ajustes', false, true, 'Ajustes, sin tutorial'],
    ['v-mac', false, true, 'Taller, sin tutorial'],
    ['v-map', false, true, 'Mapa (ya funcionaba, sigue funcionando)'],
    ['v-pistero', false, true, 'Pistero (ya funcionaba, sigue funcionando)'],
    ['v-dash', true, false, 'Inicio, CON tutorial activo -> debe seguir bloqueado'],
  ];
  casos.forEach(([vista, tutorial, esperado, nombre]) => {
    const env = montarDOM(vista, tutorial);
    const fn = new Function('document', 'setTimeout', 'clearTimeout', SRC + '\nmostrarBocadillo("hola"); return document.getElementById("pisteroBubble").classList.contains("show");');
    const resultado = fn(env.document, env.setTimeout, env.clearTimeout);
    debe(`${nombre}: se muestra=${esperado}`, resultado === esperado);
  });
}

// ---- 2) El único guard que debe quedar es el del tutorial — no hay rastro del de pantalla ----
{
  const SRC = bloque('function mostrarBocadillo(t,ms){');
  debe('ya no filtra por vista activa', !SRC.includes("_av.id!=='v-pistero'") && !SRC.includes('.view.on'));
  debe('el guard del tutorial sigue en pie (tiene una razón real: "en el tutorial solo brillo+voz")',
       SRC.includes("tutorialOverlay") && SRC.includes("classList.contains('on')"));
}

// ---- 3) h() (la voz) no depende de esta guarda — confirma que el hueco era solo visual ----
{
  const H = bloque('function h(t, prio){');
  debe('h() llama a mostrarBocadillo() para la parte visual', H.includes('mostrarBocadillo(t)'));
  debe('h() sigue de largo hacia la voz sin depender de la pantalla',
       /mostrarBocadillo\(t\);\s*\n\s*if\(!vozActiva\) return;/.test(H));
}

console.log('  aviso-visual.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
