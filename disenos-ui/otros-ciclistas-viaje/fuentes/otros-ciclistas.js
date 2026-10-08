/* MAQUETA "otros ciclistas en tu viaje" (2026-10-08) — se monta ENCIMA del prototipo real del sobrevuelo 3D.
   No es código de la app. Datos simulados: lo que el worker de cruces devolvería, ya convertido a
   "metros sobre TU ruta" (el cliente nunca recibe coordenadas del otro, solo su avance sobre tu línea). */
(function(){
var R=6371000, rad=Math.PI/180;
function hav(a,b){ var dLa=(b[1]-a[1])*rad, dLo=(b[0]-a[0])*rad, s=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLo/2)*Math.sin(dLo/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(s))); }
function densificar(c,paso){ var out=[c[0]]; for(var i=1;i<c.length;i++){ var d=hav(c[i-1],c[i]), k=Math.max(1,Math.ceil(d/paso)); for(var j=1;j<=k;j++) out.push([c[i-1][0]+(c[i][0]-c[i-1][0])*j/k, c[i-1][1]+(c[i][1]-c[i-1][1])*j/k]); } return out; }
function enD(L,d){ var c=L.c, cum=L.cum, lo=1, hi=c.length-1; d=Math.max(0,Math.min(L.total,d)); while(lo<hi){ var m=(lo+hi)>>1; if(cum[m]<d) lo=m+1; else hi=m; } var k=lo, f=Math.min(1,Math.max(0,(d-cum[k-1])/Math.max(1e-9,cum[k]-cum[k-1]))); return [c[k-1][0]+(c[k][0]-c[k-1][0])*f, c[k-1][1]+(c[k][1]-c[k-1][1])*f]; }
var L=null, yo=0, iy=0;
// Cruces simulados. dOtro(d) = dónde va el otro (metros sobre tu ruta) cuando tú vas en d.
var CRUCES=[
  {id:'b', tipo:'te-paso', d:4600, k:1.32, opts:{casco:'rojo',piel:'canela'}, txt:'Te pasó un ciclista', sub:'km 4,6 · por tu izquierda'},
  {id:'c', tipo:'lo-pasaste', d:9000, k:0.72, opts:{casco:'morado',piel:'claro',lentes:'deportivas'}, txt:'Pasaste a un ciclista', sub:'km 9,0 · en plena subida'}
];
var VENTANA=1100; // solo se ve mientras anda cerca (el worker manda ±3 min alrededor del cruce)
function caraDe(o){ try{ return _pistoDe(_pistNormal(o),'feliz'); }catch(e){ return ''; } }
// Glifo propio: la trayectoria del adelantamiento (quién queda adelante), no un ícono de catálogo.
function glifo(tipo,tam){ var col='#ffffff';
  // tú = punto lleno; el otro = anillo. La curva sale por la izquierda (en Chile se adelanta por la izquierda).
  var otroA=tipo==='te-paso'?[7,21]:[7,5], otroB=tipo==='te-paso'?[7,5]:[7,21];
  return '<svg viewBox="0 0 14 26" width="'+tam*14/26+'" height="'+tam+'" aria-hidden="true">'+
    '<path d="M'+(tipo==='te-paso'?'7 18 C1 15 1 10 7 7':'7 8 C13 11 13 16 7 19')+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2.2 1.8"/>'+
    '<circle cx="7" cy="13" r="3.1" fill="#fff"/>'+
    '<circle cx="'+otroB[0]+'" cy="'+otroB[1]+'" r="2.6" fill="#0a0f1d" stroke="'+col+'" stroke-width="1.6"/></svg>'; }
window._glifoCruce=glifo; window._yo=function(){ return yo; };
var css=document.createElement('style'); css.textContent=
 '.otro-mk{width:50px;height:62px;pointer-events:none;--c:#e8eef8;transition:filter .3s}'+
 '.otro-mk .om-pin{position:absolute;left:50%;bottom:0;width:2px;height:16px;margin-left:-1px;transform-origin:50% 100%;border-radius:2px;background:linear-gradient(to top,rgba(255,255,255,.9),var(--c));opacity:.85}'+
 '.otro-mk .om-in{position:absolute;left:2px;top:0;will-change:transform;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 50% 32%,#1e293b,#0a0f1d 75%);box-shadow:0 0 0 2px var(--c),0 5px 12px rgba(0,0,0,.55);overflow:hidden;transition:box-shadow .35s}'+
 '.otro-mk .om-c{position:absolute;left:-13%;top:-9%;width:126%;height:106%}.otro-mk .om-c svg{width:100%;height:100%;display:block}'+
 
 '.otro-mk.vivo .om-in{box-shadow:0 0 0 2.5px #fff,0 0 16px rgba(255,255,255,.75),0 5px 12px rgba(0,0,0,.55)}'+
 '.cruce{position:absolute;left:12px;right:12px;top:calc(124px + env(safe-area-inset-top));z-index:7;display:flex;align-items:center;gap:12px;padding:10px 14px 10px 10px;background:rgba(10,15,29,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#e8eef8;border:1px solid rgba(148,163,184,.18);border-left:3px solid var(--c);border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;transform:translateY(-10px);transition:opacity .35s,transform .35s;--c:#ffffff}'+
 '.cruce.on{opacity:1;transform:none}'+
 '.cr-par{position:relative;width:78px;height:52px;flex:none}'+
 '.cr-f{position:absolute;top:4px;width:44px;height:44px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 32%,#1e293b,#0a0f1d 75%)}'+
 '.cr-f>div{position:absolute;left:-13%;top:-9%;width:126%;height:106%}.cr-f svg{width:100%;height:100%;display:block}'+
 '.cr-otro{box-shadow:0 0 0 2px #fff,0 0 10px rgba(255,255,255,.5)}.cr-yo{box-shadow:0 0 0 2px #39ff88}'+
 '.cr-g{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 1px 2px #000)}'+
 '.cr-t b{display:block;font:800 1.02rem/1.1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'+
 '.cr-t span{display:block;margin-top:3px;font:600 .76rem system-ui;color:#94a3b8}'+
 '.pf-cruce{position:absolute;top:6px;transform:translateX(-50%);z-index:3;pointer-events:none;display:flex;padding:3px 5px;border-radius:9px;background:rgba(10,15,29,.88);box-shadow:0 0 0 1px rgba(255,255,255,.55),0 2px 6px rgba(0,0,0,.6)}'+
 '.pf-cruce:after{content:"";position:absolute;left:50%;top:100%;width:1px;height:48px;background:linear-gradient(currentColor,transparent);opacity:.55}';
document.head.appendChild(css);
var tarjeta=document.createElement('div'); tarjeta.className='cruce'; document.body.appendChild(tarjeta);
var hasta=0, actual='';
function mostrar(cr){ if(actual===cr.id) { hasta=performance.now()+3800; return; } actual=cr.id; hasta=performance.now()+3800;
  var yoSvg=(document.querySelector('.cara-mk .cm-c.on')||{}).innerHTML||document.querySelector('.cara-mk .cm-modelo')&&document.querySelector('.cara-mk .cm-modelo').innerHTML||'';
  var adelanteOtro=cr.tipo==='te-paso';
  tarjeta.className='cruce '+cr.tipo;
  tarjeta.innerHTML='<div class="cr-par"><div class="cr-f '+(adelanteOtro?'cr-otro':'cr-yo')+'" style="left:34px;z-index:2"><div>'+(adelanteOtro?caraDe(cr.opts):yoSvg)+'</div></div>'+
    '<div class="cr-f '+(adelanteOtro?'cr-yo':'cr-otro')+'" style="left:0;z-index:1"><div>'+(adelanteOtro?yoSvg:caraDe(cr.opts))+'</div></div></div>'+
    '<div class="cr-t"><b>'+cr.txt+'</b><span>'+cr.sub+'</span></div>';
  void tarjeta.offsetWidth; tarjeta.classList.add('on'); }
function marcasPerfil(){ var pf=document.querySelector('.perfil'); if(!pf||!L||pf.querySelector('.pf-cruce')) return; if(getComputedStyle(pf).position==='static') pf.style.position='relative';
  CRUCES.forEach(function(cr){ var m=document.createElement('div'); m.className='pf-cruce'; m.style.left=(cr.d/L.total*100)+'%'; m.style.color='#fff'; m.innerHTML=glifo(cr.tipo,20); pf.appendChild(m); }); }
var mks={};
function actualizar(){
  if(!L||!window._demo) return;
  marcasPerfil();
  CRUCES.forEach(function(cr){
    var dO=cr.d+(yo-cr.d)*cr.k, delta=dO-yo, cerca=Math.abs(yo-cr.d)<VENTANA;
    if(!cerca){ if(mks[cr.id]){ mks[cr.id].remove(); delete mks[cr.id]; } return; }
    if(!mks[cr.id]){ var el=document.createElement('div'); el.className='otro-mk '+cr.tipo; el.innerHTML='<div class="om-pin"></div><div class="om-in"><div class="om-c">'+caraDe(cr.opts)+'</div></div>';
      mks[cr.id]=new maplibregl.Marker({element:el,anchor:'bottom',opacityWhenCovered:'1'}).setLngLat(enD(L,dO)).addTo(window._demo); }
    var mk=mks[cr.id], a=Math.abs(delta), lado=a<45?(1-a/45):0; // se abre hacia la izquierda mientras van lado a lado
    mk.setLngLat(enD(L,dO)); var x=Math.round(46*Math.sin(lado*Math.PI/2)), e=mk.getElement();
    e.querySelector(".om-in").style.transform="translate("+(-x)+"px,"+(-x*0.35)+"px)";
    var h=16+x*0.35, ang=Math.atan2(x,h)*180/Math.PI; e.querySelector(".om-pin").style.height=Math.hypot(x,h)+"px"; e.querySelector(".om-pin").style.transform="rotate("+(-ang)+"deg)";
    mk.getElement().classList.toggle('vivo', a<160);
    mk.getElement().style.zIndex=delta>0?'0':'2';
    if(a<40) mostrar(cr);
  });
  if(actual && performance.now()>hasta){ tarjeta.classList.remove('on'); actual=''; }
}
// engancha la posición de Pistero: cada vez que el prototipo mueve su marcador, se recalcula "yo" sobre la misma línea
var orig=maplibregl.Marker.prototype.setLngLat;
maplibregl.Marker.prototype.setLngLat=function(ll){ var r=orig.apply(this,arguments);
  try{ var el=this.getElement&&this.getElement(); if(L && el && el.classList && el.classList.contains('cara-mk')){ var p=Array.isArray(ll)?ll:[ll.lng,ll.lat], best=1e18, bi=iy, a=Math.max(0,iy-400), b=Math.min(L.c.length-1,iy+400);
      if(Math.abs(hav(L.c[iy],p))>300){ a=0; b=L.c.length-1; }
      for(var i=a;i<=b;i++){ var dd=hav(L.c[i],p); if(dd<best){ best=dd; bi=i; } } iy=bi; yo=L.cum[bi]; actualizar(); } }catch(e){}
  return r; };
fetch('traza-pegada.json').then(function(r){ return r.json(); }).then(function(peg){ var c=densificar(peg,12), cum=[0]; for(var i=1;i<c.length;i++) cum.push(cum[i-1]+hav(c[i-1],c[i])); L={c:c,cum:cum,total:cum[cum.length-1]}; window._cruces={L:L,CRUCES:CRUCES}; });
})();
// Toma de cruce (propuesta): el director inserta una toma baja y lateral centrada entre los dos, en cámara lenta.
window._tomaCruce=function(ix,lado){ var cr=window._cruces.CRUCES[ix], L=window._cruces.L, y=window._yo(), dO=cr.d+(y-cr.d)*cr.k, mid=(y+dO)/2;
  function enD2(d){ var c=L.c,cum=L.cum,lo=1,hi=c.length-1; d=Math.max(0,Math.min(L.total,d)); while(lo<hi){ var m=(lo+hi)>>1; if(cum[m]<d) lo=m+1; else hi=m; } return c[lo]; }
  var a=enD2(mid-60), b=enD2(mid+120), y1=Math.sin((b[0]-a[0])*Math.PI/180)*Math.cos(b[1]*Math.PI/180), x1=Math.cos(a[1]*Math.PI/180)*Math.sin(b[1]*Math.PI/180)-Math.sin(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.cos((b[0]-a[0])*Math.PI/180), brg=(Math.atan2(y1,x1)*180/Math.PI+360)%360;
  window._demo.jumpTo({center:enD2(mid), zoom:16.9, pitch:66, bearing:(brg+(lado||35))%360}); };
// ayudas de captura
window._limpio=function(){ document.body.classList.add('corriendo'); var n=document.querySelector('.nota'); if(n) n.style.display='none'; document.getElementById('play').textContent='❚❚ Pausa'; };
window._listo=function(){ return !!document.querySelector('.cara-mk') && !!window._cruces; };
window._prep=function(){ var s=document.getElementById('personaje'); s.value='pistero'; s.dispatchEvent(new Event('change')); window._velX(3); };
window._irA=async function(d,ix,lado){ var t0=Date.now(), n=0; while(window._yo()<d && Date.now()-t0<35000){ window._paso(33); n++; if(n%20===0) await new Promise(function(r){ setTimeout(r,15); }); } if(ix!=null) window._tomaCruce(ix,lado); window._limpio(); await new Promise(function(r){ setTimeout(r,4500); }); return window._yo(); };
