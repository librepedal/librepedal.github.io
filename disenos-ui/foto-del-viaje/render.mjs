import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('file:///C:/Users/intyr/lp-herr/node_modules/playwright-core/index.mjs');
const d=JSON.parse(fs.readFileSync('ruta-datos.json','utf8'));
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--enable-webgl','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1200,height:1200}});
p.on('pageerror',e=>console.error('ERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.error('CONSOLE',m.text()); });
await p.goto('file:///'+path.resolve('render.html').split(path.sep).join('/'));
await p.waitForFunction(()=>window.maplibregl);
const salida={};
for (const [nombre,o] of Object.entries({
  noche_sq:{style:'https://tiles.openfreemap.org/styles/dark',tema:'noche',w:1000,h:1000,pad:120},
  claro_sq:{style:'https://tiles.openfreemap.org/styles/liberty',tema:'claro',w:1000,h:1000,pad:120},
  noche_strip:{style:'https://tiles.openfreemap.org/styles/dark',tema:'noche',w:1080,h:560,pad:80},
})){
  const r=await p.evaluate(o=>window.render(o),{...o,coords:d.coords});
  salida[nombre]=r; fs.writeFileSync(nombre+'.jpg',Buffer.from(r.img.split(',')[1],'base64'));
  console.log(nombre,'zoom',r.zoom.toFixed(2),Math.round(r.img.length/1024),'KB');
}
fs.writeFileSync('mapas.json',JSON.stringify(salida));
await b.close();
