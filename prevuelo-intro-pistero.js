/* ================= PRE-VUELO DE PISTERO (v7.30) =================
   Al arrancar el viaje, en vez del seco "GPS activado", Pistero da un pre-vuelo:
   "Antes de salir, revisa la bici. [clima real, ej. 12 grados nublado]. ¡A rodar!"
   Reusa climaDeZona()+wmoTexto() que ya existen. Todo guardado: si no hay clima o
   ubicación, dice el pre-vuelo sin el dato, nunca falla. Chileno (revisa, no revisá). */
function _prevueloPistero(bgCapable){
  // Pre-vuelo MÍNIMO (feedback Inty): al iniciar el viaje, solo lo justo y necesario, SEGÚN EL MODO.
  // Nada de clima ni "¡a rodar!" (el clima queda a pedido). Bici -> revisa la bici; motorizado -> documentos.
  var grabando = bgCapable ? ' Voy grabando tu ruta, aunque apagues la pantalla.' : ' Voy grabando tu ruta.';
  var m = (typeof actividadTipo!=='undefined') ? actividadTipo : 'ciclismo';
  var base = (m==='moto')     ? '¿Llevas tus documentos? ¿No se te olvida nada?'
           : (m==='trekking') ? 'Revisa tu mochila y tu calzado.'
           :                    'Revisa tu bici.';
  h(base + grabando);
}
/* =============== FIN PRE-VUELO DE PISTERO =============== */
/* ================= INTRO DE PISTERO — PRIMERA VEZ (v7.32) =================
   La PRIMERA vez que cada usuario entra, Pistero/Pistera se presenta usando el género
   elegido (pisteroGenero: 'l'=Pistero/compañero, 'c'=Pistera/compañera) y ofrece ayuda.
   Una SOLA vez por usuario (flag en localStorage + Firestore). Aditivo y en try/catch. */
function _pisteroIntroPrimeraVez(nombre){
  try{
    if(typeof cu==='undefined' || !cu) return false;
    if(localStorage.getItem('lp_intro_pistero_'+cu)) return false;
    var esPistera = (typeof pisteroGenero!=='undefined' && pisteroGenero==='c');
    // 2026-08-15: se saco el tutorial automatico (cortaba este mismo mensaje a mitad de
    // camino) -- el texto ya NO promete que "viene un tutorial", ahora invita a preguntar
    // cuando quieras (Pistero ya sabe mostrar el paso exacto si se lo pides por chat).
    var msg = esPistera
      ? 'Hola. Soy Pistera. Te confieso algo: sé harto de esta app, pero no soy adivina para todo lo demás. Si algo se te queda dando vueltas, me preguntas cuando quieras y te muestro cómo funciona.'
      : 'Hola. Soy Pistero. Te confieso algo: sé harto de esta app, pero no soy adivino para todo lo demás. Si algo se te queda dando vueltas, me preguntas cuando quieras y te muestro cómo funciona.';
    if(typeof h==='function') h(msg);
    localStorage.setItem('lp_intro_pistero_'+cu, '1');
    try{ db.collection('users').doc(cu).set({introPistero:true},{merge:true}); }catch(e){}
    return true;
  }catch(e){ return false; }
}
/* =============== FIN INTRO DE PISTERO =============== */
