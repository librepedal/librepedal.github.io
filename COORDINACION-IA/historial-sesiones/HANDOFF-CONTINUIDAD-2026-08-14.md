# 🧭 HANDOFF DE CONTINUIDAD — para la próxima cuenta de Claude (2026-08-14)

Inty pidió dejar el trabajo disponible antes de que se acaben los créditos. **Este archivo
es el punto de entrada: léelo primero, luego los que enlaza.** Todo está commiteado y
pusheado a GitHub (main). Haz `git pull` antes de tocar nada.

## Contexto y regla de oro
- **Libre Pedal LANZA el 2026-08-15 (mañana).** Prioridad = estabilidad, **CERO errores colaterales**.
- Método de Inty: **mockup visual → su ✓ → SPEC → código**; verificar en navegador/teléfono
  antes de dar por hecho; ser honesto con lo que no se pudo probar.
- **Coordinación entre cuentas (importante):** trabajan 2+ cuentas el mismo repo. Hoy hubo
  divergencia porque la otra cuenta desplegaba SIN pushear a git. **REGLA: pushea a git cada
  versión, no solo despliegues.** Candado = `EN-USO.md`.

## 🔴 URGENTE #1 — Desplegar el lanzamiento (v8.51)
Ver **`TAREA-LANZAMIENTO-2026-08-15.md`**. Todo listo y verificado. Falta SOLO el token
`MI-CLOUDFLARE.txt` (no está en esta máquina) + `bash deploy-seguro.sh`. La toma quien tenga el token.

## Estado del código (ya en git)
- **v8.51 = pulido Fase A** (commit 16c0351): botones (.ab/.bg profundidad+se hunden),
  insignia Darma = moneda de metal (Dharmachakra), logros = medalla con arco de progreso.
  **Probado SIN errores colaterales** (validate.js 0 errores + cargado en navegador local:
  la app arma su UI, versión 8.51 confirmada, sin SyntaxError). Base v8.50 traída de
  producción (catch-up 9ff1b18, porque la otra cuenta no había pusheado 8.35→8.50).
- **`deploy-seguro.sh` arreglado** (commit d9d12b4): copia `*.js` (voz-elevenlabs.js,
  perfil-comunidad.js) + `voces-el/`. Dry-run OK (2387 archivos, sin secretos). SPEC: `SPEC-PULIDO-UI-2026-08-14.md`.

## Pendiente aprobado por Into (POST-lanzamiento, NO meter en el launch)
1. **2 modelos de UI elegibles por el usuario, APP-WIDE** (Sólido / Cristal). Guardados en
   `disenos-ui/` (modelo-a-solido.html, modelo-b-cristal.html). Falta la capa de tema
   `body.tema-solido`/`body.tema-cristal` + selector `lp_tema_ui`. Ver `disenos-ui/README-DISENOS.md`.
2. **Logros ocultos** ("?" hasta desbloquear) + **Pistero anuncia el logro con frase** (voz+burbuja).
   PENDIENTE afinar con Inty (misterio total vs pista; tono; frase a medida por logro vs genérica).
3. **Fase B — íconos UI a línea (Lucide)**: 395 usos / 152 únicos, por lotes con preview
   (Lucide SVG real incrustado). Lote 1 = barra de nav. Método probado en `mockup-pulido-completo.html`.
4. **Estrategia de voz** — ver **`ESTRATEGIA-VOZ-2026-08-14.md`** + `disenos-ui/economia-voz.html`.
   Plan ElevenLabs = Creator (100k/mes). Router BANCO/PREMIUM/GENÉRICO + caché compartido +
   cuota por usuario. Genéricas = voz nativa (o clon Chatterbox MIT a futuro; XTTS NO).

## Lo que se necesita de otras cuentas/máquinas (no está aquí)
- `MI-CLOUDFLARE.txt` (token Pages) → para desplegar.
- API key de ElevenLabs + `gen-voces-elevenlabs.js` → para regenerar/ampliar el banco de voz.
- (Ambos los tiene la otra cuenta / otra máquina.)

## Cómo verificar SIN errores colaterales (técnica probada esta sesión)
```bash
node validate.js index.html                     # 0 errores de sintaxis (validate.js está en lp-work, no en este repo)
python -m http.server 8901 --bind 127.0.0.1     # servir el repo
# cargar http://localhost:8901/index.html en un navegador y revisar la consola:
#   el unico error esperado es el del service worker (entorno local); NADA de SyntaxError / "X is not defined".
```
Arquitectura segura para lo pendiente: **aditivo** (tema Sólido = lo de hoy sin tocar; Cristal solo
bajo su clase; voz/logros en try/catch con fallback) → imposible regresar lo actual.

## Memoria del asistente (fuera del repo, por si sirve)
`~/.claude/.../memory/librepedal-pulido-ui.md` resume esto mismo.
