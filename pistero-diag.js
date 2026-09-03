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

/* Misma info que pisteroDiagBromas(), pero HABLADA -- para que Inty no tenga que
   tocar la consola de desarrollador (imposible en el celular sin cable+compu).
   Se dispara por voz/texto ("hace rato no escucho ninguna broma", etc.) desde
   pistero-conversacion.js. Prioriza la explicación más probable: primero si
   alguna categoría quedó auto-suprimida (la causa que más se presta a confundir,
   porque no se nota desde afuera), después si está ocupado ahora mismo, después
   si la voz está apagada, y si nada de eso, cuánto falta de verdad. */
function _pisteroExplicarBromas(){
  const d=pisteroDiagBromas();
  const NOMBRES={parado:'cuando estás detenido', ciudad:'en la ciudad', lento:'cuando vas lento', normal:'a ritmo normal', rapido:'cuando vas rápido', profunda:'las reflexiones', motivacional:'los hitos cada diez kilómetros', subida:'en las subidas', bajada:'en las bajadas'};
  const cats=d.categoriasAprendidas;
  const suprimidas=(cats && typeof cats==='object') ? Object.keys(cats).filter(function(c){ return cats[c].permitida===false; }) : [];
  if(suprimidas.length){
    const nombres=suprimidas.map(function(c){ return NOMBRES[c]||c; });
    h('Ojo: dejé de comentar '+nombres.join(' y ')+' porque últimamente me callabas seguido justo después de esas frases, y aprendí a no insistir ahí. No es fijo, se me olvida solo con el tiempo. Si quieres que vuelva antes, dime "activa la voz" la próxima vez que suene algo así.');
    return;
  }
  if(!d.config.vozActiva){
    h('Tengo la voz apagada ahora mismo, por eso no me escuchas ni bromear ni nada más. Dime "activa la voz" y vuelvo.');
    return;
  }
  if(d.colaDeVoz.vozOcupada || d.colaDeVoz.largoCola){
    h('Ahora mismo tengo algo más sonando o esperando turno, por eso no te he tirado ninguna talla todavía. Apenas se libere, retomo.');
    return;
  }
  const f=d.zonaYFaltaParaLaProximaBroma;
  const cuando = (f.zonaActual==='ciudad') ? ('en ciudad me faltan '+f.siEstasEnCiudad) : ('en carretera me faltan '+f.siEstasEnCarretera);
  h('No hay nada raro: '+cuando+', o '+f.siEstasParado+' si te detienes. Voy espaciando los comentarios para no marearte a cada rato, pero ahí sigo.');
}
window._pisteroExplicarBromas = _pisteroExplicarBromas;
