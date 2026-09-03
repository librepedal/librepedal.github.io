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

