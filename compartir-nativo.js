/* ===== COMPARTIR Y GUARDAR DESDE LA APP INSTALADA (2026-10-15, auditoría "app al 100") =====
   Inty: "tampoco se pudo compartir en redes, me pide que vaya al navegador; esto debería
   funcionar desde la app". La app de Play es la web dentro de un WebView de Android, y el
   WebView NO trae navigator.share (MDN) ni descarga archivos. Resultado: en la app no funcionaba
   NINGÚN botón de compartir — video y sobrevuelo (mandaban a Chrome), resumen del año, tu viaje,
   tu perfil, seguir en vivo y hasta el mensaje del SOS (fallaban en silencio).
   Arreglo de raíz: en la app instalada, navigator.share / navigator.canShare se implementan con
   los plugins oficiales @capacitor/share y @capacitor/filesystem (package.json). Los archivos se
   escriben en la caché de la app y se pasan al menú de compartir de Android (WhatsApp, Instagram,
   TikTok, Drive, "Guardar en el teléfono"...). Así todos los botones existentes funcionan sin
   tocarlos uno por uno. lpGuardarArchivo(): descargar en la web, compartir/guardar en la app.
   Una app instalada ANTES de esta versión no trae los plugins: ahí se pide actualizar desde Play
   Store, nunca "abre Chrome". */

function _cnEsApp(){ try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }catch(e){ return false; } }
// isPluginAvailable: una app vieja sin el plugin igual devuelve un "proxy" que falla al usarlo.
function _cnPlugin(n){
  try{ if(window.Capacitor && typeof Capacitor.isPluginAvailable==='function' && !Capacitor.isPluginAvailable(n)) return null; }catch(e){}
  return (typeof lpPlugin==='function') ? lpPlugin(n) : null;
}
// true si en este dispositivo se pueden compartir archivos (web con soporte, o app con los plugins)
function lpPuedeCompartirArchivos(){
  if(_cnEsApp()) return !!(_cnPlugin('Share') && _cnPlugin('Filesystem'));
  return !!(navigator.share && navigator.canShare);
}
const LP_ACTUALIZAR_APP='Para compartir y guardar desde la app, actualiza Libre Pedal en Play Store.';

function _cnBase64(blob){
  return new Promise(function(res, rej){
    const fr=new FileReader();
    fr.onload=function(){ const s=String(fr.result||''); res(s.slice(s.indexOf(',')+1)); };
    fr.onerror=function(){ rej(fr.error||new Error('No se pudo leer el archivo')); };
    fr.readAsDataURL(blob);
  });
}
function _cnNombreSeguro(n){ return String(n||'archivo').replace(/[^\w.\-]+/g,'_').slice(-80) || 'archivo'; }

(function instalar(){
  if(!_cnEsApp()) return;
  const Share=_cnPlugin('Share'), FS=_cnPlugin('Filesystem');
  if(!Share) return; // app vieja sin el plugin: los botones siguen ocultos/avisan (ver lpGuardarArchivo)
  navigator.canShare=function(d){
    if(!d) return false;
    if(d.files && d.files.length) return !!FS;
    return !!(d.text || d.url || d.title);
  };
  navigator.share=async function(d){
    d=d||{};
    let files;
    if(d.files && d.files.length){
      if(!FS) throw new TypeError('Esta versión de la app no puede compartir archivos');
      files=[];
      for(let i=0;i<d.files.length;i++){
        const f=d.files[i];
        const r=await FS.writeFile({path:'compartir/'+Date.now()+'-'+_cnNombreSeguro(f.name), data:await _cnBase64(f), directory:'CACHE', recursive:true});
        files.push(r.uri);
      }
    }
    try{
      await Share.share({title:d.title||'Libre Pedal', text:d.text||undefined, url:d.url||undefined, files:files, dialogTitle:'Compartir'});
    }catch(e){
      // El usuario cerró el menú: igual que la web, AbortError (los llamadores ya lo ignoran).
      if(/cancel/i.test((e&&e.message)||'')){ const a=new Error('Compartir cancelado'); a.name='AbortError'; throw a; }
      throw e;
    }
  };
})();

/* Guardar un archivo: en la web lo descarga; en la app abre el menú de compartir, donde está
   "Guardar en el teléfono" / Drive / WhatsApp (Android no deja a una app web elegir carpetas).
   Devuelve 'descargado' | 'compartido' | 'cancelado' | 'actualizar' | 'error'. */
async function lpGuardarArchivo(blob, nombre, titulo){
  if(_cnEsApp()){
    if(!lpPuedeCompartirArchivos()){ lpAviso(LP_ACTUALIZAR_APP); return 'actualizar'; }
    try{
      const file=new File([blob], _cnNombreSeguro(nombre), {type:blob.type||'application/octet-stream'});
      await navigator.share({files:[file], title:titulo||nombre});
      return 'compartido';
    }catch(e){ if(e && e.name==='AbortError') return 'cancelado'; lpAviso('No se pudo guardar el archivo. Inténtalo de nuevo.'); return 'error'; }
  }
  try{
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=_cnNombreSeguro(nombre); document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    return 'descargado';
  }catch(e){ return 'error'; }
}
