/* HUECO DEL GPS CON LA PANTALLA APAGADA (2026-10-08). Inty: "cuando vuelve, el mapa genera una línea recta desde el punto
   donde se apaga la pantalla" y "el sobrevuelo llega hasta donde uno apaga el teléfono y no sigue registrando la ruta".
   Causa (código de Capacitor 8.5.2, MessageHandler.java): en la app instalada cada ubicación del GPS nativo llega a la
   página por el puente nuevo (addWebMessageListener), que se traba en segundo plano; el plugin lo documenta y pide
   android.useLegacyBridge=true (README de @capacitor-community/background-geolocation, issue #89). Ese arreglo va en la
   app nativa (versión nueva en Play Store). Mientras tanto, desde la web:
   - al volver, el primer punto queda lejos del último: el hueco se rellena SIGUIENDO EL CAMINO (OSRM, el mismo ruteo de
     la navegación) en vez de una recta, y esos km se suman (antes se perdían: la velocidad de ventana daba 0);
   - sin red o con una respuesta rara, queda la recta (como antes) pero los km en línea recta sí se suman.
   Los puntos agregados llevan est:true (estimados por el camino, no medidos). */
var lpHuecoGPS=(function(){
  var MIN_MS=45000;      // sin ubicaciones por 45 s o más…
  var MIN_KM=0.15;       // …y 150 m o más de distancia: es un hueco (menos que eso, la recta es el camino)
  var MAX_KM=200;        // más que eso no se intenta rutear (no es un hueco de pantalla apagada)
  var MAX_RAZON=3;       // el camino no puede ser más de 3 veces la recta (si no, OSRM eligió otra cosa)
  function esHueco(ant, nuevo){
    if(!ant || !nuevo || !ant.t || !nuevo.t) return false;
    var ms=nuevo.t-ant.t, km=_km(ant,nuevo);
    return ms>=MIN_MS && km>=MIN_KM && km<=MAX_KM;
  }
  function _km(a,b){ var R=6371, dL=(b.lat-a.lat)*Math.PI/180, dN=(b.lon-a.lon)*Math.PI/180,
    x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dN/2)*Math.sin(dN/2);
    return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
  // pide el camino entre a y b. Devuelve Promise<{pts:[{lat,lon}], km}> o null (sin red, sin ruta o ruta absurda)
  function porCamino(a, b, perfil, fetchFn){
    fetchFn=fetchFn||(typeof fetch==='function'?fetch:null); if(!fetchFn) return Promise.resolve(null);
    var url='https://router.project-osrm.org/route/v1/'+(perfil||'cycling')+'/'+a.lon+','+a.lat+';'+b.lon+','+b.lat+'?overview=full&geometries=geojson';
    var recta=_km(a,b);
    return Promise.resolve().then(function(){ return fetchFn(url); })
      .then(function(r){ return r&&r.ok?r.json():null; })
      .then(function(j){
        var rt=j&&j.routes&&j.routes[0], c=rt&&rt.geometry&&rt.geometry.coordinates;
        if(!c || c.length<2 || !(rt.distance>0)) return null;
        var km=rt.distance/1000; if(km<recta*0.95 || km>recta*MAX_RAZON) return null;
        var pts=c.slice(1,-1).map(function(p){ return {lat:+p[1],lon:+p[0]}; })
          .filter(function(p){ return Number.isFinite(p.lat)&&Number.isFinite(p.lon); });
        return {pts:pts, km:km};
      }).catch(function(){ return null; });
  }
  // mete los puntos del camino entre ant y nuevo (por identidad: si la ruta ya cambió, no toca nada).
  // Los tiempos se reparten a lo largo del tramo. Devuelve cuántos km de camino hay que sumar además de la recta.
  function insertar(ruta, ant, nuevo, camino){
    if(!ruta || !camino) return null;
    var i=ruta.indexOf(ant), j=ruta.indexOf(nuevo); if(i<0 || j!==i+1) return null;
    var total=0, seg=[], prev=ant;
    camino.pts.concat([nuevo]).forEach(function(p){ var d=_km(prev,p); seg.push(d); total+=d; prev=p; });
    var acum=0, dt=nuevo.t-ant.t, nuevos=camino.pts.map(function(p,k){ acum+=seg[k];
      return {lat:p.lat, lon:p.lon, t:Math.round(ant.t+dt*(total?acum/total:0)), alt:null, est:true}; });
    Array.prototype.splice.apply(ruta,[j,0].concat(nuevos));
    return Math.max(0, camino.km-_km(ant,nuevo));
  }
  return {esHueco:esHueco, porCamino:porCamino, insertar:insertar, km:_km, MIN_MS:MIN_MS, MIN_KM:MIN_KM};
})();
