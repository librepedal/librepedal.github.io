// "Busca ciclistas cerca" por voz: antes solo abría el mapa sin decir nada útil,
// y el radar en sí solo contaba "en el mundo" (sin filtrar por distancia real).
// Ahora activa el radar (si no estaba activo) Y filtra por cercanía real usando
// tu posición actual — con nombre y distancia de cada uno, no solo un número.
function _pisteroCiclistasCerca(){
  const loc=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(!radarActive) toggleRadarOnMap(); else cv('map');
  if(!loc){ h('Activa el GPS para que te diga qué tan cerca están — por ahora te dejo el radar abierto con todos los que hay visibles.'); return; }
  const RADIO_KM=50; // "cerca" para alguien en ruta, no solo a la vuelta de la esquina
  setTimeout(function(){
    const cercanos=usuariosCercanosData.map(function(u){ return Object.assign({}, u, {dist: calculateDistance(loc.lat,loc.lon,u.lat,u.lon)/1000}); })
      .filter(function(u){ return u.dist<=RADIO_KM; })
      .sort(function(a,b){ return a.dist-b.dist; });
    if(!cercanos.length){ h('Por ahora no veo otros ciclistas a menos de '+RADIO_KM+' kilómetros tuyo. Puede que aparezcan más adelante en la ruta.'); return; }
    const top=cercanos.slice(0,3);
    const texto=top.map(function(u){ return (u.nombre||'un ciclista')+' a '+u.dist.toFixed(1)+' km'; }).join(', ');
    h('Encontré '+cercanos.length+' ciclista'+(cercanos.length>1?'s':'')+' cerca tuyo: '+texto+(cercanos.length>3?', y algunos más':'')+'. Tócalos en el mapa para ver quiénes son.');
  }, 1500); // deja que termine de cargar usuariosCercanosData (subscribeToUsers, si no estaba activo)
}
