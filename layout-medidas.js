// ===== Medidas reales de la cabecera y la barra de abajo (2026-10-05) =====
// La cabecera cambia de alto (botón Atrás, safe-area del teléfono, letra del sistema) y la barra
// de abajo crece con la barra de gestos de Android. Antes las vistas de alto fijo (Pregúntale a
// Pistero, Social) restaban un número fijo (130px) y la caja de escribir quedaba debajo de la
// barra de abajo. Aquí se miden de verdad y se publican como variables CSS:
//   --lp-hdr-h  alto de <header>      --lp-nav-h  alto de <nav>
// que usan estilos.css (vistas de alto fijo, espacio final de la página y pestañas de la tienda).
(function(){
  function medir(){
    try{
      var raiz=document.documentElement.style;
      var hd=document.querySelector('header'), nv=document.querySelector('body > nav');
      if(hd && hd.offsetHeight) raiz.setProperty('--lp-hdr-h', hd.offsetHeight+'px');
      if(nv && nv.offsetHeight) raiz.setProperty('--lp-nav-h', nv.offsetHeight+'px');
    }catch(e){ console.warn('[layout] no se pudo medir cabecera/barra', e); }
  }
  function iniciar(){
    medir();
    try{
      if(typeof ResizeObserver==='function'){
        var ro=new ResizeObserver(medir);
        var hd=document.querySelector('header'), nv=document.querySelector('body > nav');
        if(hd) ro.observe(hd); if(nv) ro.observe(nv);
      } else { window.addEventListener('resize', medir); }
    }catch(e){ console.warn('[layout] sin ResizeObserver', e); window.addEventListener('resize', medir); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
