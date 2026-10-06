const fs=require("fs"),R="C:/Users/flgan/lp-audit/";
const scripts=["pistero-personalizacion-datos.js","pistero-armario.js","pistero-apariencia.js","pistero-bici.js"].map(f=>"<script>/* "+f+" (copia de la app) */\n"+fs.readFileSync(R+f,"utf8").replace(/<\/script/gi,"<\/script")+"\n</script>").join("\n");
const o={};for(const k of ["corriendo","corriendo2","sentado"])o["pudu-"+k]="data:image/jpeg;base64,"+fs.readFileSync("galeria-img/pudu-"+k+".jpg").toString("base64");
const h=fs.readFileSync("mockup-viaje.src.html","utf8").replace("{{SCRIPTS}}",()=>scripts).replace("{{IMG}}",()=>JSON.stringify(o));
fs.writeFileSync("mockup-viaje.html",h);console.log((h.length/1024|0)+" KB");
