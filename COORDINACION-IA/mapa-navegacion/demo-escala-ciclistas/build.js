#!/usr/bin/env node
// Arma ciclistas-escala-demo.html a partir de demo-template.html: descarga
// maplibre-gl.js fresco (no se guarda en el repo, son ~800KB de una librería
// de terceros que ya vive en un CDN estable) y le inyecta el mapa mundial +
// las zonas por país que sí están versionadas acá (world.geojson, world-zones.json).
//
// Uso:
//   node build.js
// Genera ciclistas-escala-demo.html en esta misma carpeta, listo para:
//   (a) abrir directo en el navegador (funciona offline salvo Google Fonts), o
//   (b) publicarlo como Artifact con la herramienta Artifact de Claude Code.
//
// Ver README.md de esta carpeta para el contexto completo (qué es, qué
// calibró Inty con el panel, y los valores finales ya aplicados en index.html).

const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = __dirname;
const MAPLIBRE_URL = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' al pedir ' + url));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Descargando maplibre-gl.js...');
  const maplibreJs = await fetchText(MAPLIBRE_URL);

  const template = fs.readFileSync(path.join(DIR, 'demo-template.html'), 'utf8');
  const worldGeojson = fs.readFileSync(path.join(DIR, 'world.geojson'), 'utf8');
  const worldZones = fs.readFileSync(path.join(DIR, 'world-zones.json'), 'utf8');

  let out = template.replace('/*__MAPLIBRE_JS__*/', maplibreJs);
  out = out.replace('/*__WORLD_GEOJSON__*/', worldGeojson);
  out = out.replace('/*__WORLD_ZONES__*/', worldZones);

  const outPath = path.join(DIR, 'ciclistas-escala-demo.html');
  fs.writeFileSync(outPath, out);
  console.log('Listo:', outPath, '(' + (Buffer.byteLength(out) / 1024 / 1024).toFixed(2) + ' MB)');
}

main().catch((err) => {
  console.error('Error armando el demo:', err.message);
  process.exit(1);
});
