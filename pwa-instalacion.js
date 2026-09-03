/* Banner de instalación: capturamos el evento y mostramos el botón #pwaInstall. */
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault(); deferredPrompt=e;
  const b=document.getElementById('pwaInstall'); if(b) b.style.display='flex';
});
function instalarPWA(){
  if(!deferredPrompt){ if(typeof h==='function') h('Para instalar: menú del navegador → \"Agregar a pantalla de inicio\".'); return; }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(function(){ deferredPrompt=null; const b=document.getElementById('pwaInstall'); if(b) b.style.display='none'; });
}
window.addEventListener('appinstalled', function(){ const b=document.getElementById('pwaInstall'); if(b) b.style.display='none'; });
