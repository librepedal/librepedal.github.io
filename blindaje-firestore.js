// BLINDAJE DE LISTENERS FIRESTORE (arregla FirebaseError "Missing or insufficient
// permissions" reportado en Sentry, iOS Safari). Causa: un onSnapshot se engancha en
// la ventana en que la auth pasa de anónima al token personalizado, el servidor le
// niega permiso un instante, y como el llamado NO trae manejador de error, el error
// queda SIN CAPTURAR (crash reportado a Sentry) y el listener muere.
// Este parche le da a todo onSnapshot(onNext) que no traiga onError un manejador que:
//  (1) si es el permiso-denegado transitorio del arranque, NO spamea y RE-ENGANCHA el
//      listener solo (tope de 5 intentos, backoff) cuando la auth ya subió;
//  (2) si es un error real, lo reporta a Sentry como antes.
// Devuelve un unsubscribe "envoltorio" que cancela los reintentos y corta el listener
// activo — así el que llamaba puede desuscribirse sin fugas ni listeners duplicados.
(function(){
  try{
    if(!(window.firebase && firebase.firestore)) return;
    var esBenigno=function(err){ return err && (err.code==='permission-denied' || /insufficient permissions|Missing or insufficient/i.test(String(err.message||err))); };
    [firebase.firestore.Query, firebase.firestore.DocumentReference].forEach(function(Cls){
      if(!Cls || !Cls.prototype || Cls.prototype.__lpSnapPatched) return;
      var orig=Cls.prototype.onSnapshot;
      Cls.prototype.onSnapshot=function(){
        var args=Array.prototype.slice.call(arguments);
        // Solo el patrón de la app: onSnapshot(onNext) — un único callback, sin onError.
        if(!(args.length===1 && typeof args[0]==='function')) return orig.apply(this, args);
        var query=this, onNext=args[0], intentos=0, cancelado=false, unsubActivo=null;
        var suscribir=function(){
          unsubActivo=orig.call(query, onNext, function(err){
            if(cancelado) return;
            if(esBenigno(err) && intentos<5){
              intentos++;
              setTimeout(function(){ if(!cancelado) suscribir(); }, 1500*intentos); // backoff: auth ya debería haber subido
            } else if(!esBenigno(err)){
              try{ if(window.Sentry) window.Sentry.captureException(err); }catch(e){}
              try{ console.warn('onSnapshot error:', err && (err.code||err.message)); }catch(e){}
            }
          });
        };
        suscribir();
        return function(){ cancelado=true; if(typeof unsubActivo==='function'){ try{ unsubActivo(); }catch(e){} } };
      };
      Cls.prototype.__lpSnapPatched=true;
    });
  }catch(e){}
})();
