/* ===== MI DIARIO (privado, AM/PM, en el teléfono) ===== */
const DIARIO_ESTADOS=[{e:'💪',l:'Excelente'},{e:'🩹',l:'Con molestias'},{e:'🐢',l:'Fatigado'}];
let diarioEstadoSel=null;
// toISOString() es UTC, no la hora local — en Chile (UTC-3/-4) escribir el diario
// de noche caía en la fecha de MAÑANA en UTC. Al día siguiente, diarioHoyKey()
// volvía a calcular esa misma fecha (ya era "hoy" de verdad) y una entrada nueva
// SOBRESCRIBÍA en silencio la de la noche anterior (mismo bug ya conocido y
// arreglado para el aviso de lluvia — acá nadie lo había aplicado).
function _fechaLocalYMD(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function diarioHoyKey(){ return 'lp_diario_'+(cu||'anon')+'_'+_fechaLocalYMD(); }
