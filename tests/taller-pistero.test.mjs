// Taller de Pistero (pistero-armario.js + pistero-bici.js + pistero-tienda.js):
// - cada pieza del Taller se dibuja en cada vehículo sin NaN/undefined
// - lo que viene de Firestore (pistOpts de OTRO usuario) no puede inyectar nada en el SVG
// - el vehículo sigue el modo del viaje y respeta la handbike y el triciclo (inclusión)
// - poses del sobrevuelo, precios (tope $1.000) e inclusión/seguridad gratis
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, cu: null, us: { armario: [] }, nombreUsuario: '',
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, body: { classList: { contains: () => false } } },
  window: { addEventListener() {} }, setTimeout: () => 0, clearTimeout() {} };
vm.createContext(ctx);
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-tienda.js', 'pistero-bici.js', 'pistero-sonidos.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
const J = (s) => vm.runInContext(s, ctx);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };
const limpio = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/NaN|undefined/.test(s);

// 1) cada pieza en cada bici (quieto, como en la tienda) + vehículos de modo
const BICIS = J('PIST_BICI.map(function(b){return b.id;})');
const CATS = { biciSkin: 'PIST_BICI_SKIN', biciAcab: 'PIST_BICI_ACAB', biciNeum: 'PIST_NEUM', biciAros: 'PIST_AROS', biciCarga: 'PIST_CARGA', biciExtra: 'PIST_EXTRA', traje: 'PIST_TRAJE', mascota: 'PIST_MASCOTA', estela: 'PIST_ESTELA', bandera: 'PIST_BANDERA' };
let malos = 0, dib = 0;
for (const t of BICIS) for (const k in CATS) for (const id of J(CATS[k] + '.map(function(x){return x.id;})')) {
  const s = J(`_pistBiciSVG({biciTipo:'${t}',${k}:'${id}',biciExtra:'${k === 'biciExtra' ? id : 'banderin'}'},{pedal:false})`); dib++;
  if (!limpio(s)) { malos++; if (malos < 5) console.log('    mal:', t, k, id); }
}
ok(malos === 0, `todas las piezas se dibujan en todas las bicis (${dib - malos}/${dib})`);
for (const v of ['moto', 'auto']) ok(limpio(J(`_pistBiciSVG({},{vehiculo:'${v}'})`)), v + ': se dibuja');
ok(!J(`_pistBiciSVG({},{pedal:false,vehiculo:'auto'})`).includes('<animate'), 'quieto (tienda) no anima');
ok((J(`_pistBiciSVG({biciTipo:'handbike'},{})`).match(/<animate/g) || []).length >= 6, 'la handbike se mueve (brazos y biela)');

// 2) barrera anti-inyección: valores fuera de catálogo se descartan
const malo = JSON.stringify('"/><script>alert(1)</script>');
const campos = ['biciTipo', 'motorTipo', 'biciSkin', 'biciAcab', 'biciNeum', 'biciAros', 'biciCarga', 'biciExtra', 'traje', 'mascota', 'estela', 'bandera', 'biciCol', 'biciCol2'];
const sucio = '{' + campos.map((c) => c + ':' + malo).join(',') + '}';
ok(!J(`_pistBiciSVG(${sucio},{})`).includes('<script'), 'pistOpts sucio no entra al dibujo');
ok(!J(`_pistBiciSVG(${sucio},{vehiculo:${malo}})`).includes('<script'), 'cfg.vehiculo sucio no entra al dibujo');
const N = J(`_pistNormal(${sucio})`);
ok(campos.every((c) => !String(N[c]).includes('<')), '_pistNormal limpia todos los campos del Taller');
ok(J(`_pistNormal({biciCol2:'#12ab34'}).biciCol2`) === '#12ab34' && J(`_pistNormal({biciCol2:'red'}).biciCol2`) === '', 'segundo color: solo #rrggbb');

// 3) el vehículo sigue el modo del viaje
const V = (o, m) => J(`_pistVehiculo(${JSON.stringify(o)},'${m}')`);
ok(V({ biciTipo: 'bmx' }, 'ciclismo') === 'bmx', 'Ruta: la bici que eligió');
ok(V({ biciTipo: 'ruta' }, 'mtb') === 'mtb', 'MTB: bici de montaña');
ok(V({ biciTipo: 'ruta' }, 'cicloviaje') === 'cicloviaje' && V({ biciTipo: 'gravel' }, 'cicloviaje') === 'gravel', 'Cicloviaje: cicloviaje (o su gravel)');
ok(V({}, 'moto') === 'auto' && V({ motorTipo: 'moto' }, 'moto') === 'moto', 'Motorizado: auto por defecto, o su moto');
ok(V({ biciTipo: 'handbike' }, 'mtb') === 'handbike' && V({ biciTipo: 'triciclo' }, 'cicloviaje') === 'triciclo', 'inclusión: la handbike y el triciclo se respetan en todos los modos en bici');

// 4) poses del sobrevuelo
for (const p of ['pie', 'sinmanos', 'caballito']) ok(limpio(J(`_pistBiciSVG({biciTipo:'ruta'},{pose:'${p}'})`)), 'pose ' + p + ' se dibuja');
ok(J(`_pistBiciSVG({},{pose:'caballito'})`).includes('rotate(-15'), 'caballito levanta la bici');

// 5) precios: tope $1.000, inclusión y seguridad gratis
ok(J('Object.keys(PIST_RAREZA).every(function(k){ return PIST_RAREZA[k].clp<=1000; })'), 'ningún precio pasa de $1.000');
for (const [k, id] of [['biciTipo', 'handbike'], ['biciTipo', 'triciclo'], ['biciExtra', 'luces'], ['bandera', 'chile'], ['biciCol2', '#123456']]) ok(J(`_ptTier('${k}','${id}')`) === 'c', `${k}:${id} gratis`);
ok(J("PIST_TABS.some(function(t){return t.id==='pintura';}) && PIST_TABS_BICI.length===6"), 'la tienda tiene las pestañas del Taller');

// 6) sonidos (pistero-sonidos.js): cada pieza que se vende tiene un sonido que existe, y sin
//    Web Audio (o con la voz en OFF) no se rompe nada
const SONIDOS = J('Object.keys(PS)');
let sinSonido = [];
for (const k of Object.keys(J('PIST_TIER'))) { if (!(k in J('_PS_CATEGORIA'))) continue; const G = J(`PIST_GRUPOS.find(function(G){return G.k==='${k}';})`);
  for (const it of G.l()) { if (!it.id) continue; const nom = J(`_psNombre('${k}','${it.id}')`); if (!nom || !SONIDOS.includes(nom)) sinSonido.push(k + ':' + it.id); } }
ok(sinSonido.length === 0, 'cada pieza del Taller suena al tocarla' + (sinSonido.length ? ' (faltan: ' + sinSonido.join(', ') + ')' : ''));
let rompio = false; try { J("pistSonar('mascota','quiltro'); pistSonarNombre('timbre'); var v=pistSonidoViaje('auto'); v.momento({pose:'caballito'}); v.parar();"); } catch (e) { rompio = true; }
ok(!rompio, 'sin Web Audio los sonidos se callan sin romper nada');
console.log(f ? `  ${f}/${n} FALLARON` : `  ✓ taller de Pistero: ${n} chequeos OK (${dib} piezas dibujadas)`);
process.exit(f ? 1 : 0);
