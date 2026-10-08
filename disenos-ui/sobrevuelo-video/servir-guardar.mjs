// Servidor local mínimo para la maqueta: sirve la raíz del repo y guarda en disenos-ui/sobrevuelo-video/ lo que se le
// manda por POST /guardar?nombre=x.png (data URL o binario). Solo para diseño, no es parte de la app.
import http from 'http'; import fs from 'fs'; import path from 'path';
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  if (q.method === 'POST' && u.pathname === '/guardar') {
    const nombre = path.basename(u.searchParams.get('nombre') || 'salida.bin'); const partes = [];
    q.on('data', (c) => partes.push(c)); q.on('end', () => { let b = Buffer.concat(partes); const s = b.slice(0, 40).toString();
      if (s.startsWith('data:')) b = Buffer.from(b.toString().split(',')[1], 'base64');
      fs.writeFileSync(path.join(raiz, 'disenos-ui/sobrevuelo-video', nombre), b); r.end('ok ' + b.length); });
    return; }
  if (u.pathname === '/') { r.statusCode = 302; r.setHeader('location', '/disenos-ui/sobrevuelo-video/arnes'); return r.end(); } // nunca abrir la app real aquí
  let f = path.join(raiz, decodeURIComponent(u.pathname)); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!f.startsWith(raiz) || !fs.existsSync(f)) { r.statusCode = 404; return r.end('no'); }
  r.setHeader('cache-control','no-store'); r.setHeader('content-type', tipos[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
}).listen(+process.argv[2] || 5180, () => console.log('listo ' + raiz));
