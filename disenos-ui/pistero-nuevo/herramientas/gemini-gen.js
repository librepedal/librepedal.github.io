/* Pegar en la pestaña de Gemini (Claude in Chrome → javascript_tool) para generar imágenes sin intervención de Inty.
   Uso:  window._r=null; gen("prompt corto en inglés").then(r=>window._r=r);  y luego leer String(window._r) cada ~38 s.
   Devuelve la URL de la imagen (gg-dl/... o gg/...) o 'blob' (entonces recargar el chat y leer el src de la última imagen).
   Para bajarla: cambiar el sufijo por =s0, abrirla en una pestaña auxiliar (redirige a rd-gg-dl/... firmado) y curl a esa URL. */
window.gen=async function(p){
  const n0=[...document.querySelectorAll('model-response')].length;
  const ed=document.querySelector('rich-textarea .ql-editor,[contenteditable=true]');
  ed.focus(); document.execCommand('insertText',false,p);
  await new Promise(r=>setTimeout(r,600));
  document.querySelector('button[aria-label="Enviar mensaje"],button[aria-label="Send message"]').click();
  for(let i=0;i<300;i++){
    await new Promise(r=>setTimeout(r,2000));
    const rs=[...document.querySelectorAll('model-response')];
    if(rs.length>n0){ const im=rs[rs.length-1].querySelector('img');
      if(im&&/googleusercontent/.test(im.src)) return im.src;
      if(im&&/^blob:/.test(im.src)) return 'blob'; }
  }
  return 'timeout';
};
