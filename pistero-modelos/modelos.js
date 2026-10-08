// ===== Modelos de Pistero (2026-10-08) =====
// Los 6 modelos de la prueba (Inty, 2026-10-07): Cyberpunk, Orbe, Slime, Androide de vinilo, Casco vivo y Clásico.
// Maqueta aprobada: disenos-ui/elige-tu-pistero/ (https://claude.ai/artifact/Vy68jqzscPQ5uQT7jy9mmR).
//   PistModelos.lista                      -> [{id, n, mov}] en el orden de la prueba (barajado por persona, ver orden())
//   PistModelos.crear(el, id) -> Promise<{poner(estado), id}>   el modelo animado dentro de `el`
//   estados: reposo · hablar · feliz · sorpresa · dormir   (+ 'r:<estado>' de los 12 del sobrevuelo en los modelos por capas)
// Cada modelo por capas se carga solo cuando se usa (su .js y sus 2 imágenes ya recortadas) y su animación se pausa
// mientras no está en pantalla (__pmRaf). Antes, en la maqueta, cada modelo tocado seguía animándose escondido.
(function(){
  var BASE=window.PM_BASE||'pistero-modelos/';
  var LISTA=[
    {id:'ciber',  n:'Cyberpunk',          mov:'Se mueve a saltos, con visor y boca de luz', fn:'crearCiberCapas',  capas:['ciber-capa-casco','ciber-capa-cabeza']},
    {id:'orbe',   n:'Orbe',               mov:'Flota; su cara es de luz',                  fn:'crearOrbeCapas',   capas:['capa-casco','capa-orbe']},
    {id:'slime',  n:'Slime',              mov:'Gelatina que tiembla y se derrite al cansarse', fn:'crearSlimeCapas', capas:['slime-capa-casco','slime-capa-cuerpo']},
    {id:'vinilo', n:'Androide de vinilo', mov:'Servos, ojos de diafragma y boca LED',      fn:'crearViniloCapas', capas:['vinilo-capa-casco','vinilo-capa-cabeza']},
    {id:'casco',  n:'Casco vivo',         mov:'Parpadea y habla con su visor LED'},
    {id:'clasico',n:'Clásico',            mov:'El Pistero de siempre'}
  ];
  var porId={}; LISTA.forEach(function(m){ porId[m.id]=m; });
  // estados de la app -> expresiones de los modelos que son un SVG por expresión
  var EXPR={ casco:{reposo:'feliz',hablar:'hablando',feliz:'riendo',sorpresa:'sorprendido',dormir:'sueno'},
             clasico:{reposo:'feliz',hablar:'contento',feliz:'emocionado',sorpresa:'sorprendido',dormir:'pensando'} };

  // la animación de un modelo por capas corre solo si su elemento está en la página y la app a la vista
  window.__pmRaf=function(el,f){
    if(el.isConnected && !document.hidden) requestAnimationFrame(f);
    else setTimeout(function(){ window.__pmRaf(el,function(){ requestAnimationFrame(f); }); },250);
  };

  var cargando={};
  function cargarJs(m){
    if(typeof window[m.fn]==='function') return Promise.resolve();
    if(cargando[m.id]) return cargando[m.id];
    cargando[m.id]=new Promise(function(ok,mal){
      var s=document.createElement('script'); s.src=BASE+m.id+'-capas.js';
      s.onload=function(){ ya(m); ok(); }; s.onerror=function(){ delete cargando[m.id]; mal(new Error('no cargó '+s.src)); };
      document.head.appendChild(s);
    });
    return cargando[m.id];
  }
  // las capas vienen recortadas de antes: la función de recorte de cada modelo devuelve la imagen tal cual
  var RECORTES=['_recortarCiber','_recortarVerde','_recortarFondo','_recortarCapa'];
  function ya(){
    RECORTES.forEach(function(n){ var f=window[n]; if(typeof f!=='function' || f.__pm) return;
      var g=function(url){ return /pistero-modelos\/img\//.test(url)?Promise.resolve(url):f.apply(this,arguments); }; g.__pm=true; window[n]=g; });
  }
  function svgDe(id,e){
    var x=(EXPR[id]&&EXPR[id][e])||'feliz';
    if(id==='casco') return typeof pisteroFrenteSVG==='function'?pisteroFrenteSVG({expr:x}):'';
    return typeof _pistoDe==='function'?_pistoDe(typeof _pistOpts==='function'?_pistOpts():{},x):'';
  }
  function crear(el,id){
    var m=porId[id]||porId.clasico;
    el.innerHTML=''; el.classList.add('pm-modelo','pm-'+m.id);
    if(!m.fn){
      var api={id:m.id, poner:function(e){ el.innerHTML=svgDe(m.id,e||'reposo'); }};
      api.poner('reposo'); return Promise.resolve(api);
    }
    return cargarJs(m).then(function(){
      return window[m.fn](el, BASE+'img/'+m.capas[0]+'.webp', BASE+'img/'+m.capas[1]+'.webp');
    }).then(function(a){ a.estado('reposo'); return {id:m.id, poner:function(e){ try{ a.estado(e||'reposo'); }catch(err){ console.warn('[pistero-modelos] estado', err); } }}; });
  }
  // orden de la prueba: barajado una vez por persona y guardado, para que ningún modelo gane solo por salir primero
  function orden(){
    var k='lp_pm_orden', ids=LISTA.map(function(m){ return m.id; });
    try{ var g=JSON.parse(localStorage.getItem(k)||'null'); if(Array.isArray(g) && g.length===ids.length && ids.every(function(i){ return g.indexOf(i)>=0; })) return g; }catch(e){}
    for(var i=ids.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=ids[i]; ids[i]=ids[j]; ids[j]=t; }
    try{ localStorage.setItem(k,JSON.stringify(ids)); }catch(e){}
    return ids;
  }
  window.PistModelos={ lista:LISTA, porId:porId, crear:crear, orden:orden, svgDe:svgDe };
})();
