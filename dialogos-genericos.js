// Reemplazo temático de alert/confirm/prompt nativos del navegador: los diálogos
// del sistema rompen la identidad visual de la app (aparecen sin el tema oscuro,
// sin el naranja de marca, genéricos). lpAviso usa el bocadillo de Pistero;
// lpConfirmar/lpPedirTexto usan un modal propio y devuelven una Promise para poder
// seguir escribiendo "if(await lpConfirmar(...))" casi igual que con confirm().
function lpAviso(msg){ mostrarBocadillo(String(msg), 6000); }
function _lpDialogCerrar(){ document.getElementById('lpDialog').classList.remove('on'); }
function lpConfirmar(msg){
  return new Promise(function(resolve){
    const modal=document.getElementById('lpDialog');
    document.getElementById('lpDialogMsg').innerText=msg;
    const inp=document.getElementById('lpDialogInput'); inp.style.display='none';
    const btnOk=document.getElementById('lpDialogBtnOk'), btnCancel=document.getElementById('lpDialogBtnCancel');
    btnCancel.style.display='block'; btnOk.innerText='Sí'; btnCancel.innerText='Cancelar';
    btnOk.onclick=function(){ _lpDialogCerrar(); resolve(true); };
    btnCancel.onclick=function(){ _lpDialogCerrar(); resolve(false); };
    modal.classList.add('on');
  });
}
// Aviso previo (Prominent Disclosure) exigido por Google Play antes de pedir el permiso
// de ubicación en segundo plano: un solo botón de "entendido", sin opción de cancelar
// desde acá (el usuario igual puede negar el permiso nativo del sistema justo después).
function lpDivulgacion(msg){
  return new Promise(function(resolve){
    const modal=document.getElementById('lpDialog');
    document.getElementById('lpDialogMsg').innerText=msg;
    const inp=document.getElementById('lpDialogInput'); inp.style.display='none';
    const btnOk=document.getElementById('lpDialogBtnOk'), btnCancel=document.getElementById('lpDialogBtnCancel');
    btnCancel.style.display='none'; btnOk.innerText='Entiendo, continuar';
    btnOk.onclick=function(){ _lpDialogCerrar(); resolve(true); };
    modal.classList.add('on');
  });
}
// Aviso destacado ÚNICO para TODO acceso a ubicación (foreground o background). Google exige
// que preceda a la PRIMERA vez que la app toca el GPS, sin importar qué camino de código lo
// dispare — no solo "Grabar un paseo"/navegación. El rechazo del 10-sept-2026 fue justo por
// esto: auth-sesion.js/auth-vinculo.js llamaban getCurrentLocation()/publicarUbicacionInicial()
// apenas resuelto el login, sin ningún aviso antes (el diálogo nativo de Android aparecía
// encima de la pantalla de login). Ahora getCurrentLocation(), publicarUbicacionInicial(),
// lpBackgroundGeo.start() y el SOS pasan todos por este mismo gate — un solo aviso, un solo
// texto, ningún camino sin cubrir. Texto alineado con la función declarada en Play Console
// (Contenido de la app > Permisos de ubicación) para que formulario, video y app coincidan.
function lpAsegurarUbicacion(){
  if(localStorage.getItem('lp_disclosure_ubicacion')) return Promise.resolve(true);
  return lpDivulgacion('📍 Ubicación, incluso en segundo plano\nLibre Pedal usa tu ubicación —incluso con la pantalla apagada o la app en segundo plano— para guiarte por voz en cada giro durante la navegación y avisarte si te desviaste de la ruta, sin que tengas que mirar el teléfono. Esa misma ubicación activa la detección automática de caídas, el botón SOS, el seguimiento en vivo (si tú lo activas) y tu posición aproximada en el mapa comunitario.\nNo se comparte con otros usuarios salvo que actives esas funciones tú mismo.')
    .then(function(){ localStorage.setItem('lp_disclosure_ubicacion','1'); return true; })
    .catch(function(e){ console.error('lpDivulgacion falló, no se accede a ubicación sin aviso:', e); return false; });
}
function lpPedirTexto(msg, placeholder){
  return new Promise(function(resolve){
    const modal=document.getElementById('lpDialog');
    document.getElementById('lpDialogMsg').innerText=msg;
    const inp=document.getElementById('lpDialogInput'); inp.style.display='block'; inp.value=''; inp.placeholder=placeholder||'';
    const btnOk=document.getElementById('lpDialogBtnOk'), btnCancel=document.getElementById('lpDialogBtnCancel');
    btnCancel.style.display='block'; btnOk.innerText='Aceptar'; btnCancel.innerText='Cancelar';
    btnOk.onclick=function(){ const v=inp.value.trim(); _lpDialogCerrar(); resolve(v||null); };
    btnCancel.onclick=function(){ _lpDialogCerrar(); resolve(null); };
    modal.classList.add('on');
    setTimeout(function(){ inp.focus(); },50);
  });
}
// "← Volver" DENTRO del modal (Logros → Ranking/Segmentos/Retos/etc.): antes solo
// existía la "✕" que cierra TODO el modal y te deja en la vista de abajo (Inicio,
// Perfil...) — para volver a una pantalla hermana (ej. de Ranking a Retos) había
// que cerrar todo y volver a entrar a Comunidad desde cero, perdiendo el lugar.
// _modalVolverA guarda el NOMBRE (string) de la función que dibuja la pantalla
// padre; cada pantalla hija lo fija antes de dibujarse y lo agrega a su HTML con
// _btnVolverModal(). null cuando no aplica (ej. Tienda abierta desde Personalizar,
// no desde Logros — ahí la "✕" ya vuelve al lugar correcto).
let _modalVolverA=null;
function _btnVolverModal(){ return _modalVolverA ? '<button class="ab sec" style="margin:0 0 10px;width:auto;padding:8px 14px" onclick="'+_modalVolverA+'()"><i class="fas fa-arrow-left"></i> Volver</button>' : ''; }

