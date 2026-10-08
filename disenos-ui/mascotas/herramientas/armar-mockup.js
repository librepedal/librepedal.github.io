const fs=require("fs"),R="C:/Users/flgan/lp-audit/";
const scripts=["pistero-personalizacion-datos.js","pistero-armario.js","pistero-apariencia.js","pistero-bici.js"].map(f=>"<script>/* "+f+" (copia de la app) */\n"+fs.readFileSync(R+f,"utf8").replace(/<\/script/gi,"<\/script")+"\n</script>").join("\n");
const o={};for(const f of fs.readdirSync("transparentes/mockup"))if(f.endsWith(".png"))o[f.slice(0,-4)]="data:image/png;base64,"+fs.readFileSync("transparentes/mockup/"+f).toString("base64");
const h=fs.readFileSync("mockup-viaje.src.html","utf8").replace("{{SCRIPTS}}",()=>scripts).replace("{{IMG}}",()=>JSON.stringify(o));
fs.writeFileSync("mockup-viaje.html",h);console.log((h.length/1024|0)+" KB");
