/* MODO EQUIVOCADO (bici <-> vehículo) — separado de motor-navegacion.js el 2026-10-09 (gate de 1000 líneas).
   Historia:
   - 2026-07-14, Inty: iba en AUTO a 82 km/h con la app en modo BICI y Pistero le hablaba de pedalear y de tomar agua.
     82 km/h sostenidos NO son pedaleando: la app se da cuenta sola. Se cambia UNA vez por sesión y se avisa siempre.
   - 2026-09-04, caso INVERSO: un tester pedaleó 120 km en modo MOTO (no se fijó qué quedó elegido) y Pistero le daba
     tips para conductores. Vuelve a bici con 20 min sostenidos en rango de ciclista (3-35 km/h) sin tocar nunca una
     velocidad inequívocamente motorizada (un auto real, en 20 min, en algún momento acelera por sobre eso).
   - 2026-10-09, Inty: "no reconoce que el ciclista después de una gran velocidad sigue en bicicleta, y está disparando
     muchas frases, la educación vial ya no va" + "no está reconociendo las subidas y las bajadas". Una BAJADA larga a
     más de 50 km/h durante un minuto lo pasaba a modo vehículo (y en vehículo no hay subidas, bajadas ni consejos de
     bici), y el minuto se medía por reloj: dos lecturas rápidas separadas por la pantalla apagada también lo disparaban.
     Ahora: solo cuenta la velocidad alta en plano o subida (en bajada un ciclista sí pasa los 50; en plano no sostiene
     55), en lecturas seguidas (un hueco de más de 15 s corta la racha) y durante 3 minutos. Y si el cambio lo hizo la
     app sola, vuelve a bici con 5 minutos pedaleando (no 20: ya se sabe que empezó en bici). */
let _velAltaDesde=0, _velAltaUlt=0, _autoModoHecho=false;
const MODO_VEL_BICI_MAX=55;        // km/h: por sobre esto, sostenido en plano o subida, no es pedaleando
const MODO_VEL_RACHA_MS=180000;    // 3 min de racha
const MODO_HUECO_MS=15000;         // entre dos lecturas: más que esto corta la racha (pantalla apagada, sin señal)
// pendiente actual en %, si se puede saber (motor-gps.js); null si no hay altitud suficiente
function _pendienteParaModo(){
  try{ if(typeof calcularPendienteActual==='function' && typeof pendienteHistory!=='undefined') return calcularPendienteActual(pendienteHistory); }catch(e){}
  return null;
}
let _movBiciDesde=0, _autoModoHechoInverso=false, _motoPorAuto=false;
function _detectarModoEquivocadoInverso(sp){
  const m=(typeof actividadTipo!=='undefined')?actividadTipo:'ciclismo';
  if(m!=='moto' || _autoModoHechoInverso){ return; }
  const TECHO_INEQUIVOCO=45; // por sobre esto, es vehículo con certeza -- reinicia la racha
  if(sp>TECHO_INEQUIVOCO){ _movBiciDesde=0; return; }
  if(!sp){ return; } // detenido (semáforo/taco): pausa la cuenta, no la reinicia -- le pasa a cualquier vehículo real
  if(sp>=3 && sp<=35){ // rango típico de ciclista
    if(!_movBiciDesde){ _movBiciDesde=Date.now(); return; }
    const espera=_motoPorAuto?300000:1200000; // 5 min si el cambio a vehículo lo hizo la app sola; 20 si lo eligió el usuario
    if(Date.now()-_movBiciDesde>espera){
      _autoModoHechoInverso=true; _motoPorAuto=false;
      try{ elegirActividad('ciclismo', true); }catch(e){}
      h('Oye, llevas un buen rato pedaleando a '+Math.round(sp)+' por hora y tenías el modo vehículo puesto, así que me cambié a modo bici. Si me equivoqué, cámbialo en tu perfil.');
    }
  } else { _movBiciDesde=0; } // ni en rango de bici ni motorizado claro (ej. muy lento sin estar detenido): sin evidencia, no cuenta
}
function _detectarModoEquivocado(sp){
  const m=(typeof actividadTipo!=='undefined')?actividadTipo:'ciclismo';
  if(m==='moto' || _autoModoHecho){ _detectarModoEquivocadoInverso(sp); return; }
  const ahora=Date.now(), hueco=_velAltaUlt && ahora-_velAltaUlt>MODO_HUECO_MS; _velAltaUlt=ahora;
  if(!sp || hueco){ _velAltaDesde=0; if(!sp) return; }
  const techo=(m==='trekking')?18:MODO_VEL_BICI_MAX; // a pie >18 km/h, o en bici >55 en plano, sostenidos = vas en vehículo
  const pend=(m==='trekking')?null:_pendienteParaModo();
  const enBajada=pend!=null && pend<-2; // en bajada un ciclista pasa los 50 km/h sin ser vehículo
  if(sp>techo && !enBajada){
    if(!_velAltaDesde){ _velAltaDesde=ahora; return; }
    if(ahora-_velAltaDesde>MODO_VEL_RACHA_MS){
      _autoModoHecho=true; _motoPorAuto=true;
      try{ elegirActividad('moto', true); }catch(e){}
      h('Oye, llevas un rato a '+Math.round(sp)+' por hora en plano. Eso no es pedaleando, así que me cambié a modo vehículo. Si me equivoqué, cámbialo en tu perfil.');
    }
  } else { _velAltaDesde=0; }
}
