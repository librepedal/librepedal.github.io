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
async function enviarResenaApp(){
  if(!_resenaEstrellas){ lpAviso('Toca una estrella para calificar primero.'); return; }
  if(_enviandoResena) return;
  _enviandoResena=true;
  const comentarioEl=document.getElementById('resenaComentario');
  const comentario=(comentarioEl&&comentarioEl.value)?comentarioEl.value.trim():'';
  try{
    await db.collection('resenasApp').add({estrellas:_resenaEstrellas, comentario:comentario, user:cu||null, nombre:nombreUsuario||null, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    if(comentarioEl) comentarioEl.value='';
    _resenaEstrellas=0; _renderResenaStars();
    h('¡Gracias por tu opinión! Nos ayuda un montón a mejorar la app.');
  }catch(e){ lpAviso('No se pudo enviar, intenta de nuevo.'); }
  finally{ _enviandoResena=false; }
}
