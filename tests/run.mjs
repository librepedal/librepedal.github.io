// Corre TODOS los tests (*.test.mjs) de esta carpeta y falla si alguno falla.
// Uso:  npm test      (o:  node tests/run.mjs)
// Sirve local y en CI (GitHub Actions): el exit code != 0 marca el build en rojo.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort();

console.log(`\n=== Corriendo ${files.length} archivo(s) de test ===\n`);
let fallaron = 0;
for (const f of files) {
  console.log(`--- ${f} ---`);
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) { fallaron++; console.log(`   >> FALLO: ${f}\n`); }
  else console.log('');
}
console.log('====================================================');
console.log(`  ${files.length - fallaron}/${files.length} archivos OK` + (fallaron ? `  —  ${fallaron} FALLARON` : '  —  todo verde'));
console.log('====================================================\n');
process.exit(fallaron ? 1 : 0);
