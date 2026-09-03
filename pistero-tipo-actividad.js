// ===== Tipo de actividad: arquitectura para escalar más allá del ciclismo (moto,
// trekking, etc.) sin tocar el comportamiento de nadie que no lo elija. 'ciclismo' es
// el default de SIEMPRE — cero cambio para quien no toque este selector. Verificado en
// vivo que router.project-osrm.org responde 200 en los 3 perfiles (cycling/foot/driving).
const ACTIVIDADES=[
  {id:'ciclismo', label:'🚴 Ruta', corto:'Ruta', icono:'🚴', osrm:'cycling', gentilicio:'ciclista', verbo:'pedaleando', color:{p:'#fc4c02',g:'#ffd700'}},
  {id:'cicloviaje', label:'🎒 Cicloviaje', corto:'Cicloviaje', icono:'🎒', osrm:'cycling', gentilicio:'cicloviajero', verbo:'pedaleando', color:{p:'#0d9488',g:'#f2b705'}},
  {id:'mtb', label:'🚵 MTB', corto:'MTB', icono:'🚵', osrm:'cycling', gentilicio:'ciclista de montaña', verbo:'rodando', color:{p:'#5c8a3a',g:'#c9a227'}},
  {id:'trekking', label:'🥾 Trekking', corto:'Trekking', icono:'🥾', osrm:'foot', gentilicio:'caminante', verbo:'caminando', color:{p:'#b5651d',g:'#8fae6e'}},
  {id:'moto', label:'🏍️ Motorizado', corto:'Motorizado', icono:'🏍️', osrm:'driving', gentilicio:'motorizado', verbo:'conduciendo', color:{p:'#2563eb',g:'#f2b705'}}
];
/* Iconos de modo A MEDIDA (pedido de Inty: "los emoji son genéricos"; bici estilo Lucide,
   huellas para senderismo, AUTO para motorizado — la moto NO va). Van aparte de ACTIVIDADES
   para no tocar esa estructura. */
// 2026-08-22: PNG recortados directo del mockup que mandó Inty (hecho con Gemini) —
// no son un redibujo, son el archivo real cortado en 5 piezas con fondo transparente
// (ver COORDINACION-IA/mapa-navegacion si hace falta el script de recorte). Viven en
// iconos-modo/ (raíz del repo, SÍ se despliega — a diferencia de COORDINACION-IA que
// deploy-seguro.sh excluye a propósito). Como son PNG con su color ya fijo (no
// currentColor), no se tiñen con el color de cada actividad — eso es correcto, el
// mockup ya trae su propia paleta naranja/marrón consistente para las 5.
function _modoIconHTML(id){ return '<img src="iconos-modo/'+id+'.png" alt="" loading="lazy">'; }
let actividadTipo=localStorage.getItem('lp_actividad')||'ciclismo';
function _actividadActual(){ return ACTIVIDADES.find(function(a){return a.id===actividadTipo;})||ACTIVIDADES[0]; }
function _osrmPerfil(){ return _actividadActual().osrm; }
// La app entera usa var(--p)/var(--g) para su color principal y de acento (116 y 57
// usos respectivos en toda la hoja de estilos) — cambiar estas dos variables en
// :root basta para que TODA la app adopte el tono del modo elegido, sin tener que
// tocar pantalla por pantalla. Ciclismo de ruta mantiene el naranja de siempre
// (cero cambio visual para quien no toca esto); los otros 3 modos tienen su propio
// tono con carácter propio, no una simple rotación de matiz.
function _aplicarTemaActividad(){
  const c=_actividadActual().color;
  document.documentElement.style.setProperty('--p', c.p);
  document.documentElement.style.setProperty('--g', c.g);
}
// ── Tema de UI app-wide (Sólido / Cristal). Mismo patrón que la actividad: localStorage
//    + Firestore + una clase en <body>. Sólido = default = look actual. Ver
//    COORDINACION-IA/SPEC-TEMAS-APP-WIDE-2026-08-14.md
let temaUI = (function(){ try{ return localStorage.getItem('lp_tema_ui')||'solido'; }catch(e){ return 'solido'; } })();
function _aplicarTemaUI(){
  if(!document.body) return;
  document.body.classList.remove('tema-solido','tema-cristal');
  document.body.classList.add('tema-'+(temaUI==='cristal'?'cristal':'solido'));
}
function elegirTemaUI(id, silencioso){
  if(id!=='solido' && id!=='cristal') return;
  temaUI=id; try{ localStorage.setItem('lp_tema_ui',id); }catch(e){}
  if(typeof cu!=='undefined' && cu){ try{ db.collection('users').doc(cu).set({temaUi:id},{merge:true}).catch(function(){}); }catch(e){} }
  _aplicarTemaUI();
  if(typeof renderTemaUIGrid==='function') renderTemaUIGrid();
  if(!silencioso && typeof h==='function') h('Tema '+(id==='cristal'?'Cristal':'Sólido')+' aplicado.');
}
function elegirActividad(id, silencioso){
  if(!ACTIVIDADES.some(function(a){return a.id===id;})) return;
  actividadTipo=id; try{ localStorage.setItem('lp_actividad',id); }catch(e){}
  // Antes solo quedaba en localStorage: si el usuario cambiaba de celular perdía la
  // preferencia sin ningún aviso. Se sube a su perfil igual que casco/lentes/skin.
  if(cu){ try{ db.collection('users').doc(cu).set({actividad:id},{merge:true}).catch(function(){}); }catch(e){} }
  _aplicarTemaActividad();
  /* Al cambiar de modo se reengancha (o se suelta) la escucha de ciclistas cerca: la
     función se suscribe sola si el modo es 'moto' y se da de baja si no. Así el que
     pedalea no gasta datos escuchando algo que no le sirve. */
  if(typeof suscribirCiclistasCerca==='function') suscribirCiclistasCerca();
  renderActividadGrid(); renderModoRegistro(); renderModoRapidoEsfera(); _actualizarBtnCicloCargado();
  if(!silencioso) h('Listo, ahora te acompaño como '+_actividadActual().gentilicio+'.');
}
function renderActividadGrid(){
  const c=document.getElementById('actividadGrid'); if(!c) return;
  c.innerHTML=ACTIVIDADES.map(function(a){ return '<div class="custom-option'+(a.id===actividadTipo?' selected':'')+'" onclick="elegirActividad(\''+a.id+'\')"><div class="check">OK</div><div class="modo-ico-svg" style="color:'+a.color.p+'">'+_modoIconHTML(a.id)+'</div><div class="label" style="font-size:0.72rem">'+a.label.replace(/^\S+\s/,'')+'</div></div>'; }).join('');
}
// Grid del selector de tema de UI (Sólido/Cristal). Mismo markup que actividad
// (.custom-option + .check + .label) + un mini-preview visual del acabado.
function renderTemaUIGrid(){
  const c=document.getElementById('temaUIGrid'); if(!c) return;
  const temas=[{id:'solido',label:'Sólido'},{id:'cristal',label:'Cristal'}];
  c.innerHTML=temas.map(function(t){
    return '<div class="custom-option'+(t.id===temaUI?' selected':'')+'" onclick="elegirTemaUI(\''+t.id+'\')">'+
      '<div class="check">OK</div>'+
      '<div class="tema-prev tema-prev--'+t.id+'"><span></span><span></span></div>'+
      '<div class="label" style="font-size:0.72rem">'+t.label+'</div></div>';
  }).join('');
}
// El mismo selector, pero en la primera pantalla (registro) — antes el modo
// quedaba escondido dentro de Perfil → Preferencias, así que casi nadie lo
// encontraba y todos arrancaban en "Ciclismo de ruta" sin saber que existían
// otros. Ahora es lo primero que se elige, y de inmediato tiñe la app entera
// con el tono de ese modo — se puede cambiar cuando quieras desde Preferencias.
function renderModoRegistro(){
  const c=document.getElementById('modoRegistroGrid'); if(!c) return;
  c.innerHTML=ACTIVIDADES.map(function(a){ return '<div class="custom-option'+(a.id===actividadTipo?' selected':'')+'" onclick="elegirActividad(\''+a.id+'\',true)"><div class="check">OK</div><div class="modo-ico-svg" style="color:'+a.color.p+'">'+_modoIconHTML(a.id)+'</div><div class="label" style="font-size:0.72rem">'+a.label.replace(/^\S+\s/,'')+'</div></div>'; }).join('');
}
// Acceso directo al modo desde la primera pantalla (la esfera): antes había que
// entrar a Perfil → Preferencias para cambiarlo, muy escondido para algo que se
// usa seguido (quien anda a veces en bici y a veces en auto lo cambia bastante
// más que una vez). Fila de íconos chica, debajo del título, sin invadir el
// gesto de girar la esfera (el hueco entre chips no bloquea el toque).
// v7.31 (SPEC 2a "el modo se repliega"): por defecto se muestra UN chip compacto
// "Vas en X · Cambiar" (menos es más, y sigue descubrible porque dice Cambiar).
// Al tocar Cambiar se despliegan los 4 modos; al elegir uno, vuelve a plegarse.
var _modoEsferaAbierto=false;
function _toggleModoEsfera(){ _modoEsferaAbierto=!_modoEsferaAbierto; renderModoRapidoEsfera(); }
function _elegirModoEsfera(id){ _modoEsferaAbierto=false; elegirActividad(id); }
function renderModoRapidoEsfera(){
  const c=document.getElementById('esModoRapido'); if(!c) return;
  if(!_modoEsferaAbierto){
    const a=_actividadActual();
    c.innerHTML='<div class="es-modo-chip selected" style="--chip-c:'+a.color.p+';--chip-bg:'+a.color.p+'33" onclick="_toggleModoEsfera()" title="Cambiar de modo"><div class="es-modo-ico" style="color:'+a.color.p+'">'+_modoIconHTML(a.id)+'</div><div class="es-modo-txt">Modo Viaje · Cambiar</div></div>';
    return;
  }
  // Desplegado: los 4 modos, cada uno con su color propio. Al elegir, se repliega.
  c.innerHTML=ACTIVIDADES.map(function(a){
    const sel=a.id===actividadTipo;
    return '<div class="es-modo-chip'+(sel?' selected':'')+'" style="--chip-c:'+a.color.p+';--chip-bg:'+a.color.p+'33" onclick="_elegirModoEsfera(\''+a.id+'\')" title="'+a.label.replace(/"/g,'')+'"><div class="es-modo-ico" style="color:'+a.color.p+'">'+_modoIconHTML(a.id)+'</div><div class="es-modo-txt">'+a.corto+'</div></div>';
  }).join('');
}
// Cicloviajero cargado (alforjas, bici de touring) vs rutero liviano: mismo
// modo "ciclismo", pero el peso extra cambia el ritmo real y a qué pendiente
// ya se siente el esfuerzo — pedido explícito de Inty ("no es lo mismo un
// rutero que un cicloviajero, anda en otras velocidades por el peso que
// carga"). Guardado aparte (no es un actividadTipo nuevo) para no tocar OSRM,
// tema visual ni el resto del sistema de ACTIVIDADES — solo afecta ritmo y
// sensibilidad de avisos de pendiente. Declarado ANTES del auto-arranque de
// abajo (renderModoRapidoEsfera etc.) porque ese arranque ya llama a
// _actualizarBtnCicloCargado() — declararlo después revienta con "cannot
// access before initialization" (bug real, encontrado al verificar en vivo).
let cicloCargado=(function(){ try{ return localStorage.getItem('lp_ciclo_cargado')==='1'; }catch(e){ return false; } })();
function setCicloCargado(on){
  cicloCargado=!!on;
  try{ localStorage.setItem('lp_ciclo_cargado', cicloCargado?'1':'0'); }catch(e){}
  _actualizarBtnCicloCargado();
  h(cicloCargado ? 'Listo, ahora ajusto los avisos al ritmo de un cicloviajero cargado.' : 'Listo, ahora ajusto los avisos al ritmo de un rutero liviano.');
}
function _actualizarBtnCicloCargado(){
  const box=document.getElementById('cicloCargadoBox'); if(!box) return;
  box.style.display='none'; // Cicloviaje ahora es su propio modo (5 modos): sub-selector retirado
  const bR=document.getElementById('btnRutero'), bC=document.getElementById('btnCicloviajero');
  const on='background:var(--p);box-shadow:0 3px 10px rgba(0,0,0,0.4),0 0 14px rgba(252,76,2,0.45)', off='background:#2a3147;box-shadow:none';
  if(bR) bR.style.cssText='flex:1;margin:0;'+(!cicloCargado?on:off);
  if(bC) bC.style.cssText='flex:1;margin:0;'+(cicloCargado?on:off);
}
// Aplica el tema y pinta el selector apenas carga el script — así la pantalla de
// registro (y una sesión que vuelve) ya se ven con el color correcto desde el
// primer pintado, no recién después de loguearse.
_aplicarTemaActividad(); _aplicarTemaUI(); renderModoRegistro(); renderModoRapidoEsfera(); _actualizarBtnCicloCargado();
