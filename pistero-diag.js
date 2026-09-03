/* Libre Pedal — diagnóstico en consola de "por qué Pistero no dice bromas".
   Por qué existe (2026-09-03, reporte real de Inty: "de hace rato no escucho
   alguna broma"): bromasDelCamino() en motor-gps.js tiene varios guardas
   independientes que pueden estar callándola sin que se note desde afuera —
   la cola de voz ocupada, el multiplicador de "cuánto habla Pistero" en
   Ajustes, o el aprendizaje de pistero-memoria.js retirando sola una
   categoría que se calló seguido (ver categoriaPermitida()). Ninguno de esos
   mecanismos es un bug por sí solo; sin verlos juntos no hay forma de saber
   CUÁL está actuando, y adivinar sería inventar un diagnóstico sin evidencia.
   Solo lee estado, no cambia nada. Uso: abrir la consola del navegador (F12)
   y escribir pisteroDiagBromas(). */
function pisteroDiagBromas(){
  const _cm=(typeof _charlaMult==='function')?_charlaMult():1;
  const ahora=Date.now();
  const minFalta=function(desde, umbralMs){ const f=(umbralMs-(ahora-(desde||0)))/60000; return f<=0?'YA (debería sonar en el próximo fix de GPS)':f.toFixed(1)+' min'; };
  const kmFalta=function(){ const u=1.5*_cm; const f=u-((typeof us!=='undefined'?us.di:0)-(typeof kmUltimaFrase!=='undefined'?kmUltimaFrase:0)); return f<=0?'YA (debería sonar en el próximo fix de GPS)':f.toFixed(2)+' km'; };

  const estado={
    config:{
      vozActiva: typeof vozActiva!=='undefined'?vozActiva:'(no definida)',
      pisteroCharla: typeof pisteroCharla!=='undefined'?pisteroCharla:'(no definida)',
      multiplicadorCadencia: _cm+'x (1x=normal, 2.6x=callado, 0.55x=hablador)',
      modoActividad: typeof actividadTipo!=='undefined'?actividadTipo:'(no definida)'
    },
    colaDeVoz:{
      vozHablando: typeof vozHablando!=='undefined'?vozHablando:'(no definida)',
      vozOcupada: typeof vozOcupada==='function'?vozOcupada():'(no definida)',
      largoCola: typeof vozCola!=='undefined'?vozCola.length:'(no definida)',
      prioridadSonando: typeof vozPrioActual!=='undefined'?vozPrioActual:'(no definida)',
      nota: (typeof vozOcupada==='function'&&(vozOcupada()||(typeof vozCola!=='undefined'&&vozCola.length))) ? 'AHORA MISMO bromasDelCamino() se está descartando por esto (se reintenta solo en el próximo fix de GPS, no es permanente)' : 'libre ahora mismo, no está bloqueando'
    },
    zonaYFaltaParaLaProximaBroma:{
      zonaActual: typeof zonaActual!=='undefined'?zonaActual:'(no definida)',
      siEstasParado: minFalta(typeof lastFraseParadoTime!=='undefined'?lastFraseParadoTime:0, 1200000*_cm),
      siEstasEnCiudad: minFalta(typeof tFraseCiudad!=='undefined'?tFraseCiudad:0, 240000*_cm),
      siEstasEnCarretera: kmFalta()
    },
    categoriasAprendidas: (window.PisteroMemoria && typeof window.PisteroMemoria.debugCategorias==='function') ? window.PisteroMemoria.debugCategorias() : '(pistero-memoria.js no cargó)'
  };

  console.log('%c=== Diagnóstico bromas de Pistero ===', 'font-weight:bold');
  console.log('Config:', estado.config);
  console.log('Cola de voz:', estado.colaDeVoz);
  console.log('Falta para la próxima (según dónde estés ahora):', estado.zonaYFaltaParaLaProximaBroma);
  console.log('Categorías con muestra suficiente (5+ veces ofrecidas) y si el sistema las retiró solo por callarlas seguido (ver pistero-memoria.js):', estado.categoriasAprendidas);
  return estado;
}
window.pisteroDiagBromas = pisteroDiagBromas;
