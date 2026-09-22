#!/usr/bin/env node
// Gate de calidad real (poka-yoke) para TODA sesión de Claude Code en esta máquina.
// Nace del patrón de hub-check.mjs: una regla en CLAUDE.md/protocolo depende de que el
// MODELO se acuerde de aplicarla; esto la aplica el programa, sin depender de memoria.
//
// Motivo directo (2026-09-22): 3 rechazos seguidos de Play Console (LibrePedal #17, #18,
// "Missing Prominent Disclosure") por no verificar el estado real de algo antes de darlo
// por bueno -- el mismo patrón que este gate ataca para CÓDIGO: no confiar en que "se ve
// bien", forzar una verificación estructural.
//
// Dos subcomandos, pensados para engancharse a hooks distintos:
//   node gate-calidad.mjs lineas   <- PostToolUse (Write|Edit): archivo > umbral -> bloquea
//   node gate-calidad.mjs stub     <- Stop: código "en falso" recién tocado -> bloquea
//
// Ambos leen el JSON del hook por stdin y devuelven JSON de hook por stdout.
// Referencia: PROTOCOLO-EXCELENCIA.md ("nunca un monolito de miles de líneas"),
// protocolos/P08-prevencion-de-errores.md ("preferir un chequeo automático sobre opinión").

import { readFileSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const UMBRAL_LINEAS = 1000;

// Extensiones donde "modularizar" tiene sentido real (código, no datos/config/vendor).
const EXT_CODIGO = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.html', '.css', '.scss',
  '.vue', '.svelte', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.php', '.rb',
]);

// Rutas donde un archivo grande es normal y no hay nada que "arreglar" (generado/vendor).
const RUTA_IGNORAR = [
  /node_modules[\\/]/, /[\\/]dist[\\/]/, /[\\/]build[\\/]/, /[\\/]\.next[\\/]/,
  /[\\/]vendor[\\/]/, /\.min\.(js|css)$/, /package-lock\.json$/, /yarn\.lock$/,
  /pnpm-lock\.yaml$/, /[\\/]\.git[\\/]/,
];

function leerStdin() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function salir(json) {
  process.stdout.write(JSON.stringify(json));
  process.exit(0);
}

function ok(msg) {
  salir(msg ? { systemMessage: msg } : {});
}

function bloquear(reason) {
  salir({ decision: 'block', reason });
}

// --- subcomando: lineas -----------------------------------------------------
function checkLineas(input) {
  const filePath = input?.tool_input?.file_path || input?.tool_response?.filePath;
  if (!filePath) return ok();
  if (RUTA_IGNORAR.some((re) => re.test(filePath))) return ok();
  const ext = path.extname(filePath).toLowerCase();
  if (!EXT_CODIGO.has(ext)) return ok();
  if (!existsSync(filePath)) return ok();
  if (statSync(filePath).size > 5_000_000) return ok(); // no leer binarios/gigantes por las dudas

  let contenido;
  try {
    contenido = readFileSync(filePath, 'utf8');
  } catch {
    return ok();
  }
  // Comentario de escape explícito y auditable, no silencioso: el humano (Inty) decide.
  if (/gate:ignorar-tamano|gate:ignorar-tamaño/.test(contenido.slice(0, 400))) return ok();

  const nLineas = contenido.split('\n').length;
  if (nLineas <= UMBRAL_LINEAS) return ok();

  bloquear(
    `${path.basename(filePath)} tiene ${nLineas} líneas (> ${UMBRAL_LINEAS}). ` +
    `Regla dura de PROTOCOLO-EXCELENCIA.md: "nunca un monolito de miles de líneas" ` +
    `(nació de Libre Pedal index.html ~7000 líneas -> regresiones). ` +
    `Antes de seguir: dividir en módulos por responsabilidad. ` +
    `Si este archivo es una excepción real y justificada (generado, vendor, dataset), ` +
    `agregar el comentario "gate:ignorar-tamano" en las primeras líneas y avisarlo explícitamente.`
  );
}

// --- subcomando: stub --------------------------------------------------------
// Patrones de "código en falso" -- angostos a propósito para no bloquear TODOs normales
// de trabajo en curso. Disparan solo si sobreviven hasta el momento de cerrar el turno.
const PATRONES_STUB = [
  { re: /TODO:?\s*(implementar|implement)\b/i, motivo: 'TODO de implementación pendiente' },
  { re: /not\s+implemented|no\s+implementado|NotImplementedError/i, motivo: 'función marcada como no implementada' },
  { re: /throw\s+new\s+Error\(\s*['"`](TODO|not implemented|stub)/i, motivo: 'throw de stub' },
  { re: /\bplaceholder\b.*\b(dato|data|texto|text|contenido|content)\b/i, motivo: 'placeholder presentado como contenido real' },
  { re: /catch\s*\([^)]*\)\s*\{\s*\}/, motivo: 'catch vacío (traga errores en silencio -- trampa ya documentada en librepedal-trampas-tecnicas)' },
];
const ESCAPE_STUB = /gate:permitido/i;

function checkStub() {
  // Solo tiene sentido dentro de un repo git: mira el diff SIN COMMITEAR (lo que se
  // acaba de escribir en esta sesión), no la deuda vieja del proyecto (eso es un
  // trabajo de auditoría aparte, no un gate de "recién escribiste esto").
  let cwd;
  try {
    cwd = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return ok(); // no es un repo git, no hay diff que mirar
  }

  let diff;
  try {
    diff = execSync('git diff -U0 --diff-filter=ACMR', { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return ok();
  }
  if (!diff) return ok();

  const hallazgos = [];
  let archivoActual = null;
  for (const linea of diff.split('\n')) {
    const mArchivo = linea.match(/^\+\+\+ b\/(.+)$/);
    if (mArchivo) { archivoActual = mArchivo[1]; continue; }
    if (!linea.startsWith('+') || linea.startsWith('+++')) continue;
    const contenidoLinea = linea.slice(1);
    if (ESCAPE_STUB.test(contenidoLinea)) continue;
    for (const { re, motivo } of PATRONES_STUB) {
      if (re.test(contenidoLinea)) {
        hallazgos.push(`  - ${archivoActual}: ${motivo} -> "${contenidoLinea.trim().slice(0, 90)}"`);
        break;
      }
    }
  }

  if (hallazgos.length === 0) return ok();

  bloquear(
    `Antes de dar esto por listo: quedaron ${hallazgos.length} marca(s) de código en falso ` +
    `en lo que se acaba de escribir (P08-prevencion-de-errores.md, "código en falso" / ` +
    `Definición de LISTO de PROTOCOLO-EXCELENCIA.md):\n${hallazgos.join('\n')}\n` +
    `Resolver cada una, o si es intencional y ya se avisó a Inty explícitamente, ` +
    `agregar el comentario "gate:permitido <motivo>" en esa misma línea.`
  );
}

// --- main ---------------------------------------------------------------------
const sub = process.argv[2];
const input = leerStdin();

if (sub === 'lineas') checkLineas(input);
else if (sub === 'stub') checkStub(input);
else ok();
