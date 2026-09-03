/* ===== SUSCRIPCION PEREZOSA (2026-08-23) =====
   Al iniciar sesion se enganchaban 11 listeners de golpe, sin importar que pantalla
   estuvieras mirando, y cada uno lee su coleccion ENTERA de arranque: reportes 200,
   users 150, chat 100, novedades 60, guiComments 50, hostels 50, recommendations 50,
   repairTips 20... ~700 documentos como piso, antes de que el usuario tocara nada.
   Firestore cobra por documento leido, y el plan gratis da 50.000 lecturas al dia PARA
   TODO EL PROYECTO: con ~700 por apertura, bastaban ~70 aperturas para dejar la app sin
   base de datos. Medido en la consola el 2026-08-23: 73.000 lecturas contra 210
   escrituras, con maximo 4 conexiones simultaneas. O sea el gasto no venia de tener
   muchos usuarios sino de que ABRIR la app costaba carisimo -- por eso ya habia
   reventado con 48 usuarios.
   Ahora cada pantalla engancha lo suyo la primera vez que se abre. Se suscribe UNA vez
   por sesion y no se desuscribe: asi el que entra y sale de una pantalla no paga de
   nuevo, y los datos que ya estaban siguen ahi (desuscribir y volver a enganchar seria
   peor, cobra la coleccion completa cada vez).
   Lo que NO se difiere, a proposito:
     - subscribeToFriendRequests: pinta #solicBadge y #esAvisos, que se ven desde fuera
       de su pantalla. Ademas es where('to','==',cu): son solo TUS solicitudes.
     - subscribeToReportes: alimenta el aviso de superficie ANTES de arrancar a pedalear
       (ver _avisoSuperficieRuta) y los avisos de Pistero en la zona. Se engancha al abrir el
       mapa, al iniciar navegacion y al empezar a grabar en toggleGPS() (sus DOS caminos: el
       plugin nativo y watchPosition del navegador).
     - loadTrips: la global `trips` NO se usa solo en su pantalla -- au() saca de ahi el
       contador de viajes del panel de Inicio y statViajesCompletados() alimenta los logros.
       Diferirla dejaba el contador en cero y los logros mal a quien nunca abriera "Mis
       viajes". Ademas es where('user','==',cu): son solo TUS viajes, sale barato. */
const _subsHechas={};
function _subUnaVez(clave, fn){
  if(_subsHechas[clave]) return;
  if(typeof fn!=='function') return;
  _subsHechas[clave]=true;
  try{ fn(); }catch(e){ _subsHechas[clave]=false; /* que un fallo no deje la pantalla muerta para siempre */ }
}
// Escribe/borra la posicion propia en Realtime Database. Firestore sigue recibiendo la
// misma escritura donde ya la recibia (no se toca) -- esto solo AGREGA el espejo en RTD,
// que es lo que ahora lee subscribeToUsers().
function _rtdPublicarPosicion(lat, lon){
  if(!cu) return;
  try{
    rtdb.ref('posiciones/'+cu).set({
      lat:lat, lon:lon, visible:true, ts:Date.now(),
      nombre:(typeof nombreUsuario!=='undefined'&&nombreUsuario)||'Ciclista',
      skin:(typeof selectedSkin!=='undefined'&&selectedSkin)||'',
      helmet:(typeof selectedHelmet!=='undefined'&&selectedHelmet)||'',
    }).catch(function(){});
  }catch(e){}
}
// Se borra el nodo entero (no se pisa con visible:false) para no dejar basura de
// ciclistas que ya no comparten -- una lectura nunca trae mas de lo que hay de verdad.
function _rtdOcultarPosicion(){
  if(!cu) return;
  try{ rtdb.ref('posiciones/'+cu).remove().catch(function(){}); }catch(e){}
}
/* Emula la forma de un snapshot de Firestore ({id, data()}) para que _renderMainMapUsers/
   _renderNavMapUsers -que ya reciben eso mismo desde siempre- no necesiten cambiar nada. */
function _rtdSubscribeToUsers(callback){
  var ref = rtdb.ref('posiciones').orderByChild('ts').limitToLast(150);
  var handler = function(snap){
    var val = snap.val() || {};
    var docs = Object.keys(val).map(function(uid){
      var d = val[uid];
      return { id: uid, data: function(){ return d; } };
    });
    callback(docs);
  };
  ref.on('value', handler, function(){ /* error: sin permiso o RTD caido -- el mapa sigue con lo ultimo que tenia */ });
  return function(){ ref.off('value', handler); };
}
function subscribeToUsers(){ if(ulp){ try{ulp();}catch(e){} ulp=null; } ulp=_rtdSubscribeToUsers(function(docs){ _lastUsersSnapshotDocs=docs; _renderMainMapUsers(docs); if(_navMapUsersActive) _renderNavMapUsers(docs); }); }
/* Este listener es el mas caro de la app: se re-dispara con cada movimiento de CUALQUIER
   ciclista visible, multiplicado por cuanta gente lo tiene abierto. Con la app en segundo
   plano (pantalla apagada, otra pestaña) nadie esta mirando esos puntos, asi que pagar esas
   lecturas es puro desperdicio. Se pausa al ocultarse y se retoma al volver -si de verdad
   estaba activo, no si el mapa nunca se habia abierto-. */
var _lpUsersPausadoPorFondo = false;
document.addEventListener('visibilitychange', function(){
  if(document.hidden){
    if(ulp){ try{ ulp(); }catch(e){} ulp=null; _lpUsersPausadoPorFondo=true; }
  } else if(_lpUsersPausadoPorFondo){
    _lpUsersPausadoPorFondo = false;
    if(typeof subscribeToUsers==='function' && !ghostMode) subscribeToUsers();
  }
});
