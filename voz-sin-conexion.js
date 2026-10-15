/* ===== VOZ EN ESPAÑOL SIN CONEXIÓN — aviso único para instalarla =====
   Paso 3 de COORDINACION-IA/ENCARGO-SIN-SENAL-2026-10-14.md. Sin señal, los giros los dice
   la voz del teléfono (ver _vozPlazoUrgente en voz-motor.js). Pero si el teléfono no tiene
   descargada la voz en español, ese respaldo suena en inglés o no suena. Ninguna app puede
   instalar voces por su cuenta: la tiene que bajar el usuario. Lo que hace la app es revisar
   si falta y, solo en ese caso, avisar UNA vez con los pasos.

   - App de Play: el plugin de voz (@capacitor-community/text-to-speech) le pregunta a
     Android con isLanguageSupported(), que da false si los datos de esa voz no están
     descargados (TextToSpeech.isLanguageAvailable → LANG_MISSING_DATA). El aviso trae un
     botón que abre la pantalla de voces del sistema (openInstall). Como esa pantalla cambia
     según la marca del teléfono, el aviso trae igual los pasos escritos.
   - Web en Android: se revisan las voces del navegador (speechSynthesis) y se muestran los
     pasos. En computador o iPhone no se avisa: los pasos son de Android.
   Se revisa al calcular una ruta para navegar y al descargar el mapa de la ruta, que es
   cuando el usuario se prepara para andar sin señal. Si dice "Ahora no", vuelve a aparecer
   recién en 7 días (y solo si la voz sigue faltando). */

const VOZ_SC_CLAVE='lp_voz_sin_conexion_aviso';
const VOZ_SC_REPETIR_MS=7*86400000;
const VOZ_SC_LANGS=['es-CL','es-US','es-419','es-MX','es-ES','es'];
const VOZ_SC_PASOS='Para instalarla: Ajustes del teléfono → busca "Texto a voz" → motor de Google → engranaje → Instalar datos de voz → Español. El camino cambia un poco según la marca.';

// Pura: ¿toca mostrar el aviso? tiene: true/false/null (null = no se pudo saber).
function vozScDebeAvisar(tiene, esAndroid, ultimoAviso, ahora){
  if(tiene!==false) return false;          // la tiene, o no se pudo saber: no molestar
  if(!esAndroid) return false;             // los pasos son de Android
  return !ultimoAviso || (ahora-ultimoAviso)>=VOZ_SC_REPETIR_MS;
}
// Pura: ¿alguna de estas voces del navegador es español y funciona sin red?
function vozScHayEspanolLocal(voces){
  return (voces||[]).some(function(v){ return /^es([-_]|$)/i.test(v.lang||'') && v.localService!==false; });
}

function _vozScEsAndroid(){
  try{ if(window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform()==='android') return true; }catch(e){}
  return /Android/i.test((navigator && navigator.userAgent)||'');
}
function _vozScVocesWeb(){
  return new Promise(function(res){
    if(!('speechSynthesis' in window)){ res(null); return; }
    let vs=[]; try{ vs=speechSynthesis.getVoices()||[]; }catch(e){}
    if(vs.length){ res(vs); return; }
    // Chrome carga las voces tarde: se espera el aviso de que llegaron, con tope.
    let listo=false;
    const fin=function(){ if(listo) return; listo=true; let v=[]; try{ v=speechSynthesis.getVoices()||[]; }catch(e){} res(v.length?v:null); };
    try{ speechSynthesis.addEventListener('voiceschanged', fin, {once:true}); }catch(e){}
    setTimeout(fin, 1500);
  });
}
// true = tiene voz en español sin red · false = falta · null = no se pudo saber
async function vozEspanolSinConexion(){
  const t=(typeof lpPlugin==='function') ? lpPlugin('TextToSpeech') : null;
  if(t && typeof t.isLanguageSupported==='function'){
    let respondio=false;
    for(let i=0;i<VOZ_SC_LANGS.length;i++){
      try{ const r=await t.isLanguageSupported({lang:VOZ_SC_LANGS[i]}); respondio=true; if(r && r.supported) return true; }catch(e){}
    }
    return respondio ? false : null;
  }
  const voces=await _vozScVocesWeb();
  if(!voces) return null;
  return vozScHayEspanolLocal(voces);
}
function _vozScUltimo(){ try{ return Number(localStorage.getItem(VOZ_SC_CLAVE))||0; }catch(e){ return 0; } }
function _vozScMarcar(){ try{ localStorage.setItem(VOZ_SC_CLAVE, String(Date.now())); }catch(e){} }

let _vozScRevisando=false;
async function revisarVozSinConexion(){
  if(_vozScRevisando) return; _vozScRevisando=true;
  try{
    const esAndroid=_vozScEsAndroid();
    if(!esAndroid) return;
    if(!vozScDebeAvisar(false, esAndroid, _vozScUltimo(), Date.now())) return; // ya avisado hace poco: ni se revisa
    const tiene=await vozEspanolSinConexion();
    if(!vozScDebeAvisar(tiene, esAndroid, _vozScUltimo(), Date.now())) return;
    _vozScMarcar();
    _vozScMostrar();
  } finally { _vozScRevisando=false; }
}
function _vozScMostrar(){
  const t=(typeof lpPlugin==='function') ? lpPlugin('TextToSpeech') : null;
  const puedeAbrir=!!(t && typeof t.openInstall==='function');
  const modal=document.getElementById('lpDialog'); if(!modal) return;
  document.getElementById('lpDialogMsg').innerText=
    'Tu teléfono no tiene la voz en español para usar sin señal.\n'+
    'Cuando no hay internet, Pistero te dice los giros con la voz del teléfono. Sin esa voz, no los vas a escuchar en español.\n\n'+VOZ_SC_PASOS;
  const inp=document.getElementById('lpDialogInput'); if(inp) inp.style.display='none';
  const ok=document.getElementById('lpDialogBtnOk'), no=document.getElementById('lpDialogBtnCancel');
  ok.innerText=puedeAbrir?'Abrir instalación de voz':'Entendido';
  no.style.display='block'; no.innerText='Ahora no';
  ok.onclick=function(){ _lpDialogCerrar(); if(puedeAbrir){ try{ const p=t.openInstall(); if(p && p.catch) p.catch(function(){ lpAviso(VOZ_SC_PASOS); }); }catch(e){ lpAviso(VOZ_SC_PASOS); } } };
  no.onclick=function(){ _lpDialogCerrar(); };
  modal.classList.add('on');
}
