/* ================================================================
   voz-elevenlabs.js — Catalogo de voces ElevenLabs de Pistero/Pistera
   ================================================================
   Modulo APARTE de index.html (directiva de arquitectura de Inty,
   2026-08-13: codigo nuevo en su propio archivo, no metido en el
   monolito). Carga voces-el/manifest.json (generado por
   scripts/gen-voces-elevenlabs.js) y reproduce las frases fijas de
   los 11 arquetipos vivos con la voz ElevenLabs que le corresponde a
   cada uno (ya quedo "horneada" en el archivo al generarlo -> aca solo
   se reproduce, no se elige voz en este script).
   Si el archivo no existe o falla (404, sin red, este script ni
   siquiera cargo), cae solo al catalogo viejo Azure (voces/) o a la
   voz en vivo -- exactamente el mismo comportamiento que había antes
   de este archivo. Cero riesgo de romper algo si esto falla.
   Aditivo y en try/catch, mismo patron que el resto de la app. */
(function(){
  'use strict';
  window.VOCES_MANIFEST_EL = null;
  try{
    fetch('voces-el/manifest.json')
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(m){ window.VOCES_MANIFEST_EL = m; })
      .catch(function(){});
  }catch(e){}

  // Mismo patron que _vozArchivo() en index.html (linea ~2407), pero apuntando a
  // voces-el/ en vez de voces/. Si falla, cae a la voz chilena EN VIVO (no a la
  // nativa del navegador directo), igual que el resto de la cadena de respaldos.
  window._vozArchivoEL = function(item, durEst, id, miGen){
    let cayo = false;
    const fallback = function(){
      if(cayo || miGen !== vozGen) return;
      cayo = true;
      _vozAzureRuntime(item, durEst, miGen);
    };
    try{
      const a = new Audio('voces-el/' + pisteroGenero + id + '.mp3');
      _vozNeuralAudio = a;
      a.onloadedmetadata = function(){
        if(isFinite(a.duration) && a.duration > 0){
          clearTimeout(vozTimerFin);
          _pisteroHabla(a.duration * 1000 + 300);
          vozTimerFin = setTimeout(_vozSiguiente, Math.round(a.duration * 1000) + 2500);
        }
      };
      a.onplaying = function(){ cayo = true; };
      a.onended = function(){ clearTimeout(vozTimerFin); _vozNeuralAudio = null; _vozSiguiente(); };
      a.onerror = function(){ if(cayo){ clearTimeout(vozTimerFin); _vozNeuralAudio = null; _vozSiguiente(); } else { fallback(); } };
      const p = a.play();
      if(p && p.catch) p.catch(function(){ fallback(); });
    }catch(e){ fallback(); }
  };
})();
