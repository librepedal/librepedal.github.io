import fs from 'node:fs';
const pts=JSON.parse(fs.readFileSync('traza-gps.json'));
const rad=Math.PI/180, d=(a,b)=>Math.hypot((b.lon-a.lon)*111320*Math.cos(a.lat*rad),(b.lat-a.lat)*110540);
// 1) fuera saltos imposibles (bici > 22 m/s respecto del último bueno) 2) un punto cada >=40 m
const limpio=[];for(const p of pts){const u=limpio.at(-1);if(u&&d(u,p)/((p.t-u.t)/1000)>12)continue;limpio.push(p);}
for (const paso of [25,40,70]){
const muestra=[];for(const p of limpio){const u=muestra.at(-1);if(!u||d(u,p)>=paso)muestra.push(p);}
const body={shape:muestra.map(p=>({lat:p.lat,lon:p.lon})),costing:'bicycle',shape_match:'map_snap',trace_options:{search_radius:35,gps_accuracy:10}};
const r=await fetch('https://valhalla1.openstreetmap.de/trace_route',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const j=await r.json();
console.log('limpio',limpio.length,'paso',paso,'muestra',muestra.length,j.trip?('legs '+j.trip.legs.length+' km '+j.trip.legs.map(l=>l.summary.length).join('+')):JSON.stringify(j).slice(0,200));
if(paso===40&&j.trip){const dec=s=>{let i=0,la=0,lo=0,o=[];while(i<s.length){for(const k of[0,1]){let sh=0,res=0,b;do{b=s.charCodeAt(i++)-63;res|=(b&31)<<sh;sh+=5}while(b>=32);const v=(res&1)?~(res>>1):(res>>1);if(k)lo+=v;else la+=v;}o.push([lo/1e6,la/1e6]);}return o;};fs.writeFileSync('traza-pegada.json',JSON.stringify(j.trip.legs.flatMap((l,i)=>{const c=dec(l.shape);return i?c.slice(1):c;})));}
}
