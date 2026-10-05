/* ===== ENTREGAR UN ARCHIVO AL USUARIO (navegador y app de Android) — 2026-10-05 =====
   Bug real: en la app de Play (Capacitor) un <a download> con blob: NO hace nada — el WebView de
   Android no maneja descargas — y aun así la app confirmaba "Ruta exportada", "Respaldo descargado",
   "Video descargado". Pasaba en el GPX, el respaldo de datos, la imagen del resumen anual, el video de
   la ruta y el CSV del panel admin.
   lpEntregarArchivo(contenido, nombre, tipo) -> Promise<boolean>: true SOLO si el archivo se entregó.
   - Navegador: descarga normal.
   - App: lo guarda en la caché y abre el menú Compartir de Android (@capacitor/filesystem +
     @capacitor/share, incluidos desde el AAB 8.809). Cerrar el menú no es un error (false, sin aviso).
   - App sin esos plugins (instalaciones viejas): avisa la verdad en vez de fingir. */
function _lpBlobABase64(blob){
  return new Promise(function(ok, mal){ var r=new FileReader(); r.onload=function(){ ok(String(r.result).split(',')[1]||''); }; r.onerror=function(){ mal(r.error); }; r.readAsDataURL(blob); });
}
async function lpEntregarArchivo(contenido, nombre, tipo){
  var archivo=String(nombre||'libre-pedal').replace(/[^\w.-]+/g,'_').slice(0,60);
  var nativo=(typeof window.Capacitor!=='undefined')&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform();
  if(nativo){
    var FS=(typeof lpPlugin==='function')?lpPlugin('Filesystem'):null, SH=(typeof lpPlugin==='function')?lpPlugin('Share'):null;
    try{
      if(!FS||!SH) throw new Error('sin plugins de archivos');
      var esTexto=(typeof contenido==='string');
      var datos=esTexto?contenido:await _lpBlobABase64(contenido);
      var w={path:archivo, data:datos, directory:'CACHE'}; if(esTexto) w.encoding='utf8';
      var r=await FS.writeFile(w);
      await SH.share({title:'Libre Pedal', files:[r.uri], dialogTitle:'Guardar o enviar'});
      return true;
    }catch(e){
      if(e && /cancel/i.test(String(e.message||e))) return false; // cerró Compartir: no es un error
      console.warn('[archivo] no se pudo entregar en la app', archivo, e);
      if(typeof lpAviso==='function') lpAviso('Esta versión de la app todavía no puede guardar archivos. Actualízala desde Play Store, o hazlo entrando a librepedal.cl desde el navegador.');
      return false;
    }
  }
  var blob=(typeof contenido==='string')?new Blob([contenido],{type:tipo||'application/octet-stream'}):contenido;
  var url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=archivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); },4000);
  return true;
}
