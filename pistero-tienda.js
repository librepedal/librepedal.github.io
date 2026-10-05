/* ===== TIENDA / ARMARIO DE PISTERO (2026-10-04, pedido de Inty) =====
   Pistero grande arriba (fijo mientras se elige) + pestañas chicas por categoría;
   cada pestaña muestra SOLO lo suyo. Cada pieza tiene rareza y precio:
     Común (gratis) · Raro · Épico · Legendario
   Tocar cualquier pieza la PRUEBA en el Pistero de arriba aunque no se tenga.

   Criterio para no abusar (mismo que usan Brawl Stars / Fortnite / Duolingo):
   - Identidad SIEMPRE gratis: piel, ojos, peinados, colores de pelo naturales,
     pestañas, labial. Nadie paga por verse como es.
   - Seguridad SIEMPRE gratis: luz trasera, reflectante, visera.
   - Colores libres de cada pieza gratis (el selector "+").
   - Lo cosmético llamativo es lo que se vende, a precio de "antojo" (≈ un café).

   TIENDA_COBRO_ACTIVO=false mientras no exista el cobro (en Android tiene que ser con
   Google Play Billing): todo se puede usar y se muestra un aviso de lanzamiento con
   los precios que tendrá después. Con true, lo no-común solo se equipa si está en
   us.armario (lista 'clave:id' que escribiría SOLO el worker de compras, igual que
   us.premium -- nunca el cliente). */

var TIENDA_COBRO_ACTIVO=false;
// Regla de Inty (2026-10-04): NINGÚN precio pasa de $1.000 (packs incluidos).
var PIST_RAREZA={
  c:{n:'Común',clp:0},
  r:{n:'Raro',clp:290},
  e:{n:'Épico',clp:590},
  l:{n:'Legendario',clp:990}
};
// Rareza por pieza; lo que no aparece es Común (gratis).
var PIST_TIER={
  casco:{dorado:'r',cromo:'r',cobre:'r',perla:'r',neon:'r',atardecer:'r',oceano:'r',arcoiris:'e',galaxia:'l'},
  acabado:{metal:'r',perla:'e',carbono:'e',neon:'l'},
  diseno:{doble:'r',chile:'r',rayo:'r',cuadros:'r',estrellas:'r',lunares:'r',ondas:'r',zigzag:'r',corazones:'r',numero:'r',llamas:'e',tigre:'e',camuflaje:'e'},
  acc:{camara:'r',cresta:'r',antena:'r',gato:'r',oso:'r',conejo:'r',flor:'r',lazo:'r',brote:'r',estrella:'r',diablo:'r',vikingo:'e',unicornio:'e',helice:'e',pinchos:'e',dino:'e',corona:'l',aureola:'l',alas:'l'},
  gadget:{gopro:'r',espejo:'r',banderin:'r'},
  lentes:{sinmarco:'r',media:'r',escudo:'e',radar:'e'},   // Marco completo y Fotocromáticas: gratis
  peloCol:{'#f472b6':'r','#a78bfa':'r','#3b82f6':'r','#34d399':'r','#ef4444':'r'},
  marca:{barro:'r',curita:'r',corazon:'r',brillos:'r',guerrero:'r'},
  aro:{estrella:'r',corazon:'r',colgante:'r',doble:'r'},
  cuello:{buff:'r',bufanda:'r',maillot:'r',pajarita:'e',collar:'e'},
  biciTipo:{gravel:'r',bmx:'r',playera:'r'},   // handbike y triciclo adaptado: inclusión, SIEMPRE gratis
  // ---- Taller (2026-10-04). Seguridad (luces), quitar cosas, colores libres y el bicolor: gratis.
  biciSkin:{degrade:'r',retro:'r',chile:'r',camo:'e',llamas:'e',galaxia:'l'},
  biciAcab:{metal:'r',carbono:'e',neon:'l'},
  biciNeum:{cafe:'r',blanca:'r',rojo:'r',neon:'e'},
  biciAros:{negro:'r',cuadro:'r',dorado:'e'},
  biciCarga:{canasto:'r',alforjas:'e',bikepacking:'e',caja:'r'},
  biciExtra:{banderin:'r',patito:'r',dorsal:'e'},
  bandera:{argentina:'r',peru:'r',bolivia:'r',colombia:'r',mexico:'r',uruguay:'r',espana:'r',arcoiris:'r'},  // Chile gratis
  mascota:{quiltro:'r',negro:'r',gato:'r'},
  traje:{equipo:'r',retro:'r',enduro:'r',chile:'r',montana:'e',lider:'e',campeon:'l',huaso:'r',pascuero:'r',heroe:'e',dino:'e'},
  estela:{chispas:'r',hojas:'r',nieve:'r',burbujas:'r',arcoiris:'e',fuego:'l'}
};
// Pestañas del Taller: ahí el Pistero grande de arriba se muestra en su bici.
var PIST_TABS_BICI=['bici','pintura','ruedas','carga','traje','estela'];
function _ptTier(k,id){ if(!id) return 'c'; var m=PIST_TIER[k]; return (m&&m[id])||'c'; }
function _ptPrecio(t){ var p=PIST_RAREZA[t].clp; return p?('$'+String(p).replace(/\B(?=(\d{3})+(?!\d))/g,'.')):'Gratis'; }
function _ptTiene(k,id){
  if(!TIENDA_COBRO_ACTIVO || _ptTier(k,id)==='c') return true;
  var a=(typeof us!=='undefined'&&us&&Array.isArray(us.armario))?us.armario:[];
  return a.indexOf(k+':'+id)!==-1;
}
// Nunca se guarda una pieza que no se tiene (lo llama _pistGuardar).
function _ptLimpiar(o){ Object.keys(PIST_TIER).forEach(function(k){ if(o[k] && !_ptTiene(k,o[k])) o[k]=PIST_DEF[k]; }); return o; }

// Íconos de pestaña hechos a medida (trazo fino, mismo lenguaje que iconos-lucide.js)
function _ptIco(d){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'; }
var PIST_TABS=[
  {id:'casco',n:'Casco',i:_ptIco('<path d="M3 15a9 8 0 0 1 18 0z"/><path d="M12 7v7"/><path d="M7.5 9.5l1 2.5M16.5 9.5l-1 2.5"/>'),g:[{k:'casco',t:'Color'},{k:'acabado',t:'Acabado'}]},
  {id:'diseno',n:'Diseño',i:_ptIco('<path d="M3 16a9 8 0 0 1 18 0z"/><path d="M12.5 8.5l-2.5 4h3l-2 3.5"/>'),g:[{k:'diseno',t:'Diseño'},{k:'disenoCol',t:'Color del diseño'}]},
  {id:'acc',n:'Accesorios',i:_ptIco('<path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z"/><path d="M4 18h16"/>'),g:[{k:'acc',t:'Accesorio de casco'},{k:'accCol',t:'Color del accesorio'}]},
  {id:'equipo',n:'Equipo',i:_ptIco('<rect x="3" y="7" width="13" height="10" rx="2"/><circle cx="9.5" cy="12" r="2.8"/><path d="M16 10.5l5-2.5v8l-5-2.5"/>'),g:[{k:'gadget',t:'Equipo'},{k:'gadgetCol',t:'Color del equipo'}]},
  {id:'lentes',n:'Lentes',i:_ptIco('<circle cx="6.5" cy="13" r="3.8"/><circle cx="17.5" cy="13" r="3.8"/><path d="M10.3 12.5h3.4M2.7 12L2 9.5M21.3 12l.7-2.5"/>'),g:[{k:'lentes',t:'Lentes'},{k:'lentesCol',t:'Color del lente'},{k:'marcoCol',t:'Color del marco'}]},
  {id:'pelo',n:'Pelo',i:_ptIco('<path d="M7 21c-3-6-1-15 5-16s8 6 6 10c-1 2 0 4 1 6"/><path d="M10 21c-1-4 0-8 3-10"/>'),g:[{k:'pelo',t:'Peinado'},{k:'peloCol',t:'Color de pelo'}]},
  {id:'cara',n:'Cara',i:_ptIco('<circle cx="12" cy="12" r="9"/><path d="M8 14.5c2 2 6 2 8 0"/><path d="M9 9.5v1M15 9.5v1"/>'),g:[{k:'marca',t:'Detalles'},{k:'ojosCol',t:'Color de ojos'},{k:'pest',t:'Pestañas'},{k:'labios',t:'Labial'}]},
  {id:'aros',n:'Aros',i:_ptIco('<circle cx="12" cy="15.5" r="5"/><path d="M12 3v7.5"/>'),g:[{k:'aro',t:'Aros'},{k:'aroCol',t:'Metal o color'}]},
  {id:'cuello',n:'Cuello',i:_ptIco('<path d="M4 7c5 3.5 11 3.5 16 0l.8 4.5c-5.5 3.5-12 3.5-17.6 0z"/><path d="M14.5 11.5l1.8 8.5h-3.6l.6-8"/>'),g:[{k:'cuello',t:'Cuello'},{k:'pano',t:'Color'}]},
  {id:'bici',n:'Bici',i:_ptIco('<circle cx="5.5" cy="16.5" r="3.8"/><circle cx="18.5" cy="16.5" r="3.8"/><path d="M5.5 16.5l4-7h6l3 7M9.5 9.5l3 7h3M14 6h3l-1.5 3.5"/>'),g:[{k:'biciTipo',t:'Tu bici'},{k:'biciCol',t:'Color de la bici'},{k:'biciCol2',t:'Segundo color'},{k:'motorTipo',t:'Para el modo Motorizado'}]},
  {id:'pintura',n:'Pintura',i:_ptIco('<path d="M4 20l5-5"/><path d="M9 15l7.5-7.5a2.5 2.5 0 0 1 3.5 3.5L12.5 18.5z"/><path d="M14 10l3 3"/>'),g:[{k:'biciSkin',t:'Diseño del cuadro'},{k:'biciAcab',t:'Acabado'}]},
  {id:'ruedas',n:'Ruedas',i:_ptIco('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.2"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/>'),g:[{k:'biciNeum',t:'Neumáticos'},{k:'biciAros',t:'Aros'}]},
  {id:'carga',n:'Carga',i:_ptIco('<rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M4 12.5h16"/><path d="M10 12.5v2.5M14 12.5v2.5"/>'),g:[{k:'biciCarga',t:'Carga'},{k:'mascota',t:'Mascota'},{k:'biciExtra',t:'Extras'},{k:'bandera',t:'Bandera del banderín'}]},
  {id:'traje',n:'Traje',i:_ptIco('<path d="M8 4l-4.5 3 2 4 2-1.2V20h9V9.8l2 1.2 2-4L16 4c-.8 1.6-2.2 2.5-4 2.5S8.8 5.6 8 4z"/>'),g:[{k:'traje',t:'Traje y disfraces'}]},
  {id:'estela',n:'Estela',i:_ptIco('<circle cx="17" cy="12" r="3"/><path d="M13 9.5H5M13.5 12H3M13 14.5H6"/>'),g:[{k:'estela',t:'Estela al pedalear'}]},
  {id:'piel',n:'Piel',i:_ptIco('<path d="M12 3c4 5 6 8.2 6 11a6 6 0 0 1-12 0c0-2.8 2-6 6-11z"/>'),g:[{k:'piel',t:'Tono de piel'}]}
];
// Encuadre de las tarjetas (2026-10-04, Inty: "unos Pisteros más grandes, otros más chicos, no caen
// bien en la tarjeta"). Antes cada pestaña recortaba distinto (la cabeza medía 44 px en Piel y 55 en
// Casco) y algunas piezas se salían (espejo, banderín, afro). Ahora hay DOS encuadres fijos, medidos
// como la caja que contiene TODAS las piezas de su familia + margen: Pistero mide lo mismo en todas
// las pestañas de la cara y en todas las de la bici, y ninguna pieza queda cortada.
//   retrato: unión de casco, diseño, accesorios, equipo, pelo, cara, lentes, aros, cuello y piel = -2.5 -1.2 105 91.2
//   bici:    unión de bici, pintura, ruedas, carga, traje y estela                                 = -6.4 -4.1 124.4 114.5
var PIST_ENCUADRE={retrato:'-5 -4 110 96', bici:'-9 -7 130 120'};
function _ptEncuadre(svg){ return svg.replace(/viewBox="[^"]*"/, 'viewBox="'+PIST_ENCUADRE[PIST_TABS_BICI.indexOf(_ptTab)>=0?'bici':'retrato']+'"'); }

var _ptTab='casco', _ptPrueba=null, _ptFiltro='', _ptGesto=0, _ptMotor=false; // _ptMotor: arriba se ve el auto/moto (se tocó "Para el modo Motorizado")
function _ptGrupo(k){ return (typeof PIST_GRUPOS!=='undefined'&&PIST_GRUPOS.find(function(G){return G.k===k;}))||null; }
function _ptNombre(k,id){ var G=_ptGrupo(k), it=G&&G.l().find(function(x){return x.id===id;}); return it?it.n:id; }
function _ptOpts(){ var o=_pistOpts(); if(_ptPrueba){ o[_ptPrueba.k]=_ptPrueba.id; if(_ptPrueba.k==='cuello'&&_ptPrueba.id&&!o.pano) o.pano='#fc4c02'; if(_ptPrueba.k==='disenoCol'&&!o.diseno) o.diseno='franja'; if(_ptPrueba.k==='bandera'&&_ptPrueba.id&&o.biciExtra!=='banderin') o.biciExtra='banderin'; } return o; }
function _ptRarezaMax(o){ var mx='c'; Object.keys(PIST_TIER).forEach(function(k){ var t=_ptTier(k,o[k]); if('crel'.indexOf(t)>'crel'.indexOf(mx)) mx=t; }); return mx; }

function _ptTabs(){ return PIST_TABS.map(function(T){ return '<button type="button" role="tab" class="pt-tab'+(T.id===_ptTab?' on':'')+'" aria-selected="'+(T.id===_ptTab)+'" onclick="_ptAbrirTab(\''+T.id+'\')"><span class="pt-tab-i">'+T.i+'</span><span>'+T.n+'</span></button>'; }).join(''); }
function _ptAbrirTab(id){ _ptTab=id; _ptPrueba=null; _ptMotor=false; _ptRender(); var pn=document.getElementById('ptPanel'); if(pn) pn.scrollTop=0;
  // deja la tienda entera a la vista (Pistero + pestañas + lista) bajo la cabecera
  var ti=document.getElementById('pistTienda'), hd=document.querySelector('header'); if(ti){ var y=ti.getBoundingClientRect().top-(hd?hd.getBoundingClientRect().height:0)-6; if(Math.abs(y)>8) try{ window.scrollBy({top:y,behavior:'smooth'}); }catch(e){ /* gate:permitido scroll cosmetico */ } } var b=document.querySelector('.pt-tab.on'); if(b&&b.scrollIntoView) try{ b.scrollIntoView({block:'nearest',inline:'center'}); }catch(e){ /* gate:permitido scroll cosmetico, navegadores viejos */ } }
function _ptFiltrar(f){ _ptFiltro=(_ptFiltro===f)?'':f; _ptRender(); }
function _ptElegir(k,id){
  if(k==='motorTipo') _ptMotor=true; else if(PIST_TABS_BICI.indexOf(_ptTab)>=0) _ptMotor=false;
  if(_ptTiene(k,id)){ _ptPrueba=null; _pistSet(k,id); if(typeof pistSonar==='function') pistSonar(k,id); return; } // suena al ponerla (probar es en silencio)
  _ptPrueba={k:k,id:id}; _ptRender();
}
function _ptQuitarPrueba(){ _ptPrueba=null; _ptRender(); }
function _ptComprar(){ // el cobro real (Google Play Billing + worker que escribe us.armario) aún no existe
  if(typeof lpAviso==='function') lpAviso('La tienda abre pronto. Por ahora puedes probar todo lo que quieras.');
}
function _ptCambiarGesto(){ _ptGesto=(_ptGesto+1)%5; _ptPreview(); }

function _ptPreview(){
  var box=document.getElementById('customize-preview-svg'); if(!box) return;
  var o=_ptOpts(), gestos=['feliz','contento','guino','sorprendido','emocionado'];
  var enBici=(PIST_TABS_BICI.indexOf(_ptTab)>=0&&typeof _pistBiciSVG==='function'), svg=enBici?_pistBiciSVG(o,{expr:gestos[_ptGesto],vehiculo:_ptMotor?(o.motorTipo==='moto'?'moto':'auto'):''}):_pistoDe(o,gestos[_ptGesto]), mx=_ptRarezaMax(o);
  box.className='pt-pistero r-'+mx+(enBici?' en-bici':'');
  box.innerHTML=svg+(mx==='l'||mx==='e'?'<span class="pt-chispa s1"></span><span class="pt-chispa s2"></span><span class="pt-chispa s3"></span><span class="pt-chispa s4"></span>':'');
  var n=document.getElementById('customizeCharacterName'); if(n&&typeof nombreUsuario!=='undefined'&&nombreUsuario) n.innerText=nombreUsuario;
  var bar=document.getElementById('ptCompra'); if(!bar) return;
  if(_ptPrueba){
    var t=_ptTier(_ptPrueba.k,_ptPrueba.id);
    bar.innerHTML='<span class="pt-rz r-'+t+'">'+PIST_RAREZA[t].n+'</span><b>'+_ptNombre(_ptPrueba.k,_ptPrueba.id)+'</b><button type="button" class="pt-comprar" onclick="_ptComprar()">'+_ptPrecio(t)+'</button><button type="button" class="pt-quitar" onclick="_ptQuitarPrueba()" aria-label="Quitar prueba">×</button>';
    bar.classList.add('on');
  } else { bar.classList.remove('on'); bar.innerHTML=''; }
}

function _ptCard(G,it,o,actual){
  var t=_ptTier(G.k,it.id), sel=(actual===it.id), tiene=_ptTiene(G.k,it.id), prueba=_ptPrueba&&_ptPrueba.k===G.k&&_ptPrueba.id===it.id;
  var m={}; m[G.k]=it.id; if(G.k==='cuello'&&it.id&&!o.pano) m.pano='#fc4c02';
  var mix=Object.assign({},o,m), svg=_ptEncuadre(G.svg?G.svg(mix):_pistoDe(mix,'feliz'));
  return '<button type="button" class="pt-card r-'+t+(sel?' sel':'')+(prueba?' prueba':'')+(tiene?'':' lock')+'" onclick="_ptElegir(\''+G.k+'\',\''+it.id+'\')" title="'+it.n+'">'
    +'<span class="pt-card-img">'+svg+'</span><span class="pt-card-n">'+it.n+'</span>'
    +'<span class="pt-card-p">'+(sel?'<i class="fas fa-check"></i> Puesto':(t==='c'?'Gratis':(tiene&&TIENDA_COBRO_ACTIVO?'Tuyo':_ptPrecio(t))))+'</span></button>';
}
function _ptChip(G,it,actual){
  var t=_ptTier(G.k,it.id), sel=(actual===it.id), c=it.id?(G.col?G.col(it):it.id):G.vacio;
  return '<button type="button" class="pist-chip pt-chip r-'+t+(sel?' sel':'')+(_ptTiene(G.k,it.id)?'':' lock')+'" onclick="_ptElegir(\''+G.k+'\',\''+it.id+'\')" title="'+it.n+(t!=='c'?' · '+PIST_RAREZA[t].n+' '+_ptPrecio(t):'')+'" aria-label="'+it.n+'"><span style="background:'+c+'"></span></button>';
}
function _ptRender(){
  var panel=document.getElementById('ptPanel'), tabs=document.getElementById('ptTabs'); if(!panel) return false;
  if(tabs) tabs.innerHTML=_ptTabs();
  var lz=document.getElementById('ptLanza'); if(lz) lz.style.display=TIENDA_COBRO_ACTIVO?'none':'';
  var T=PIST_TABS.find(function(x){return x.id===_ptTab;})||PIST_TABS[0], o=_pistOpts();
  var conPro=T.g.some(function(g){ return PIST_TIER[g.k]; });
  var html=conPro?'<div class="pt-filtros"><button type="button" class="'+(_ptFiltro==='gratis'?'on':'')+'" onclick="_ptFiltrar(\'gratis\')">Gratis</button><button type="button" class="'+(_ptFiltro==='pro'?'on':'')+'" onclick="_ptFiltrar(\'pro\')">Pro</button></div>':'';
  T.g.forEach(function(g){
    var G=_ptGrupo(g.k); if(!G) return;
    var actual=(o[G.k]||''), lista=G.l().filter(function(it){ if(!it.id||!_ptFiltro) return true; var t=_ptTier(G.k,it.id); return _ptFiltro==='gratis'?t==='c':t!=='c'; });
    if(!lista.length) return;
    html+='<div class="pist-sub">'+g.t+'</div>';
    if(G.chip){ html+='<div class="pist-chip-row">'+lista.map(function(it){ return _ptChip(G,it,actual); }).join('')+(G.libre&&_ptFiltro!=='pro'?_pistChipLibre(G.k,actual,!!actual&&!G.l().some(function(it){return it.id===actual;})):'')+'</div>'; }
    else html+='<div class="pt-grid">'+lista.map(function(it){ return _ptCard(G,it,o,actual); }).join('')+'</div>';
  });
  panel.innerHTML=html;
  _ptPreview();
  return true;
}
// primer pintado del Pistero del usuario en la cabecera/pestañas (después del login,
// _setExprPistero lo repinta con el personaje de esa cuenta)
if(typeof document!=='undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', function(){ try{ _pintarMiPistero(true); }catch(e){ console.warn('[pistero] no se pudo pintar el Pistero del usuario', e); } });
