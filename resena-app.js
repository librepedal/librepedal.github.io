/* ===== Reseña de la app (2026-08-24, pedido de Inty) =====
   Cajón propio de estrellas + comentario, guardado en Firestore (colección
   `resenasApp`) para que Inty lo vea — SEPARADO del botón "Calificar en Play
   Store" (deep-link directo a la ficha real, sin API nativa). La API oficial de
   Google ("In-App Review") requeriría un plugin nativo de Capacitor y reconstruir
   el AAB, que esta sesión tiene prohibido tocar — esto cumple el mismo objetivo
   100% desde index.html, sin nada nativo. Los dos botones quedan siempre visibles
   juntos, sin condicionar uno al otro por la nota que se puso (no manipular a
   quién se le ofrece dejar reseña pública). */
let _resenaEstrellas=0;
function _renderResenaStars(){
  const cont=document.getElementById('resenaStars'); if(!cont) return;
  let html='';
  for(let i=1;i<=5;i++){
    html+='<button type="button" class="resena-star'+(i<=_resenaEstrellas?' on':'')+'" onclick="_resenaSetEstrellas('+i+')" aria-label="'+i+' estrella'+(i>1?'s':'')+'"><i class="fas fa-star"></i></button>';
  }
  cont.innerHTML=html;
}
function _resenaSetEstrellas(n){ _resenaEstrellas=n; _renderResenaStars(); }
let _enviandoResena=false;
/* Sin señal, Firestore NO responde a add(): la promesa espera al servidor ("resolves once the document has been
   successfully created in the backend", firebase-js-sdk reference_impl.ts) y el dato queda guardado en el teléfono
   (persistencia offline activada en index.html) hasta que vuelve la conexión. Antes "Enviar" quedaba congelado y los
   toques siguientes no hacían nada (revisión de botones 2026-10-07). Tope de 8 s: se libera y se avisa la verdad. */
const _RESENA_TOPE_MS=8000;
async function enviarResenaApp(){
  if(!_resenaEstrellas){ lpAviso('Toca una estrella para calificar primero.'); return; }
  if(_enviandoResena) return;
  _enviandoResena=true;
  const comentarioEl=document.getElementById('resenaComentario');
  const comentario=(comentarioEl&&comentarioEl.value)?comentarioEl.value.trim():'';
  try{
    const envio=db.collection('resenasApp').add({estrellas:_resenaEstrellas, comentario:comentario, user:cu||null, nombre:nombreUsuario||null, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    const r=await Promise.race([envio.then(function(){ return 'ok'; }), new Promise(function(res){ setTimeout(function(){ res('sin-senal'); }, _RESENA_TOPE_MS); })]);
    if(comentarioEl) comentarioEl.value='';
    _resenaEstrellas=0; _renderResenaStars();
    if(r==='ok') h('¡Gracias por tu opinión! Nos ayuda un montón a mejorar la app.');
    else h('Ahora no hay señal: tu opinión quedó guardada en el teléfono y se envía sola apenas vuelva la conexión. ¡Gracias!');
  }catch(e){ lpAviso('No se pudo enviar, intenta de nuevo.'); }
  finally{ _enviandoResena=false; }
}
