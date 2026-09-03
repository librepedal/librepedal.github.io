
/* ===== NOVEDADES: competencias, rodadas y cicloturismo en Chile (curado, admin publica) ===== */
let novedadesCache=[], novedadesCatActiva='todos';
const NOVEDADES_CAT_LABEL={competencia:'🏁 Competencia',rodada:'🚴 Rodada',cicloturismo:'🌎 Cicloturismo',oficial:'🏛️ Oficial'};
function subscribeToNovedades(){
  db.collection('novedades').orderBy('ts','desc').limit(60).onSnapshot(function(snapshot){
    novedadesCache=snapshot.docs.map(function(doc){ return Object.assign({id:doc.id},doc.data()); });
    renderNovedadesList();
    const admin=document.getElementById('novedades-admin'); if(admin) admin.style.display=(cu===ADMIN_ID)?'block':'none';
  }, function(){
    const c=document.getElementById('novedades-list'); if(c) c.innerHTML='<p style="color:#7d8ba0;font-size:0.8rem;text-align:center;padding:20px 0">No se pudieron cargar las novedades. Revisa tu conexión.</p>';
  });
}
function filtrarNovedades(cat,el){
  novedadesCatActiva=cat;
  const tabs=document.getElementById('novedadesTabs'); if(tabs) tabs.querySelectorAll('.gtt').forEach(function(t){t.classList.remove('on');});
  if(el) el.classList.add('on');
  renderNovedadesList();
}
function renderNovedadesList(){
  const c=document.getElementById('novedades-list'); if(!c) return;
  const items=novedadesCatActiva==='todos'?novedadesCache:novedadesCache.filter(function(n){return n.categoria===novedadesCatActiva;});
  if(!items.length){ c.innerHTML='<p style="color:#7d8ba0;font-size:0.8rem;text-align:center;padding:20px 0">Todavía no hay novedades en esta categoría.</p>'; return; }
  c.innerHTML=items.map(function(n){
    const esAdmin=(cu===ADMIN_ID);
    return '<div class="novedad-card">'
      +'<div class="novedad-top"><span class="novedad-badge">'+(NOVEDADES_CAT_LABEL[n.categoria]||n.categoria||'')+'</span>'+(n.fecha?'<span class="novedad-fecha">'+escapeHTML(n.fecha)+'</span>':'')+'</div>'
      +'<h4>'+escapeHTML(n.titulo||'')+'</h4>'
      +(n.desc?'<p>'+escapeHTML(n.desc)+'</p>':'')
      +'<div class="novedad-bottom">'+(_linkSeguro(n.link)?'<a href="'+encodeURI(n.link)+'" target="_blank" rel="noopener">Ver más →</a>':'<span></span>')+(esAdmin?'<button class="novedad-del" onclick="eliminarNovedad(\''+n.id+'\')"><i class="fas fa-trash-can"></i> </button>':'')+'</div>'
      +'</div>';
  }).join('');
}
// Solo http(s) — un link "javascript:..." guardado por error (o por una cuenta
// admin comprometida) se ejecutaría en el navegador de CUALQUIERA que vea
// Novedades al tocar "Ver más". Se valida acá (antes de guardar) y de nuevo al
// mostrar (por si un dato viejo o cargado a mano no pasó por acá).
function _linkSeguro(url){ return typeof url==='string' && /^https?:\/\//i.test(url.trim()); }
async function publicarNovedad(){
  if(cu!==ADMIN_ID) return;
  const titulo=document.getElementById('nov-titulo').value.trim();
  const categoria=document.getElementById('nov-categoria').value;
  const fecha=document.getElementById('nov-fecha').value.trim();
  const desc=document.getElementById('nov-desc').value.trim();
  const link=document.getElementById('nov-link').value.trim();
  if(!titulo) return lpAviso('Ponle un título a la novedad');
  if(link && !_linkSeguro(link)) return lpAviso('El link debe empezar con http:// o https://');
  try{
    await db.collection('novedades').add({titulo:titulo,categoria:categoria,fecha:fecha,desc:desc,link:link,ts:firebase.firestore.FieldValue.serverTimestamp()});
    document.getElementById('nov-titulo').value=''; document.getElementById('nov-fecha').value=''; document.getElementById('nov-desc').value=''; document.getElementById('nov-link').value='';
    h('Novedad publicada.');
  }catch(e){ lpAviso('No se pudo publicar: '+e.message); }
}
async function eliminarNovedad(id){
  if(cu!==ADMIN_ID) return;
  if(!await lpConfirmar('¿Borrar esta novedad?')) return;
  try{ await db.collection('novedades').doc(id).delete(); }catch(e){ lpAviso('No se pudo borrar.'); }
}
