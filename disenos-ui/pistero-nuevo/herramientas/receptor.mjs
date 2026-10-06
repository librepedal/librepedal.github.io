// Recibe imágenes generadas en Gemini (POST /guardar?n=nombre.jpg) y las guarda en el proyecto. Solo localhost.
import http from 'http'; import { writeFileSync } from 'fs';
const DEST='C:/Users/flgan/lp-audit/disenos-ui/pistero-nuevo/gemini/';
const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'*','Access-Control-Allow-Private-Network':'true'};
http.createServer((req,res)=>{
  if(req.method==='OPTIONS'){ res.writeHead(204,H); return res.end(); }
  const u=new URL(req.url,'http://x'); const n=(u.searchParams.get('n')||'').replace(/[^\w.-]/g,'');
  if(req.method!=='POST'||!n){ res.writeHead(400,H); return res.end('no'); }
  const ch=[]; req.on('data',c=>ch.push(c)); req.on('end',()=>{ const b=Buffer.concat(ch); writeFileSync(DEST+n,b); console.log('guardado',n,b.length); res.writeHead(200,H); res.end('ok '+b.length); });
}).listen(5199,'127.0.0.1',()=>console.log('receptor en 5199'));
