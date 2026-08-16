# 🗃️ Backlog de mejoras — RECLAMABLE por cualquier cuenta Claude

Pedido de Inty: auditar de punta a punta, no dejar detalle sin ver, y dejar TODO como
trabajo que **cualquier sesión Claude pueda tomar**. Este es el tablero. Auditoría de
fondo en `AUDITORIA-CEO-2026-08-14.md`.

## Cómo tomar una tarea (protocolo, ambas cuentas)
1. Latido: `git fetch origin && git pull --ff-only origin main` (ver CLAUDE.md).
2. Elige una tarea **LIBRE**, cámbiala a `EN-CURSO {cuenta} rama {feature/...}` en este archivo
   (commit corto a main), y trabaja en tu rama. Así nadie la duplica.
3. Al terminar: `HECHO` + link al merge. Tests 12/12 verdes antes de mergear. Nada roto a prod.
4. Regla de oro: `main` = producción. Nunca commits de código directo a main; solo ramas + merge validado.

## Estado (P0 launch-crítico · P1 alto · P2 fondo)

| ID | Área | P | Tarea | Archivos | Estado |
|----|------|---|-------|----------|--------|
| T01 | Perf | P1 | `defer`/`async` en scripts CDN no críticos (jsPDF, Sentry) | index.html (head) | LIBRE |
| T02 | Perf | P1 | Lazy-load MapLibre/Leaflet solo al abrir el mapa | index.html | LIBRE |
| T03 | Perf | P1 | Minificar index.html en el deploy (paso en deploy-seguro.sh, CI) | deploy-seguro.sh | LIBRE |
| T04 | PWA | P1 | Precachear/self-host libs CDN para que la app funcione offline | sw.js, index.html | LIBRE |
| T05 | Voz | P1 | **Perfeccionar fidelidad del clon** — HECHO: 0.89 vs techo real 0.78 = indistinguible; params default óptimos. Ver VOZ-CLON-LOCAL-2026-08-14.md | lp-voz-clon/ | HECHO (Opus) |
| T06 | Voz | P1 | Generar banco ampliado (números 0–100, calles, 24 logros, saludos) mp3 | lp-voz-clon/, voces-el/ | LIBRE (tras T05) |
| T07 | Voz | P1 | Router de voz en la app (banco/premium/genérico) + prosodia | index.html, voz-elevenlabs.js | LIBRE (otra cuenta) |
| T08 | A11y | P2 | `role`/`aria` en nav, modales, chips, controles (hoy 12 aria, 0 role) | index.html | LIBRE |
| T09 | A11y | P2 | Foco visible + navegación por teclado (273 onclick inline) | index.html | LIBRE |
| T10 | A11y | P2 | Contraste AA en tema oscuro + Cristal | index.html | LIBRE |
| T11 | Código | P2 | Triar y cerrar/registrar los 137 TODO/FIXME | index.html | LIBRE |
| T12 | Código | P2 | Seguir modularizando el monolito (extraer más .js) | index.html | LIBRE |
| T13 | Seg | P1 | Auditar colecciones Firestore con `read:if true` por fuga de PII | firestore.rules | LIBRE |
| T14 | Seg | P0 | Resolver hold de firestore.rules + publicar una sola vez | firestore.rules, PAUSA-* | PAUSADO Lenovo — Inty confirmó en vivo "no estoy seguro, déjalo en pausa" (¿Sudamérica mismo proyecto Firebase?) |
| T15 | UI | P1 | Migrar emojis→Font Awesome (194 emojis/667 usos) | index.html | EN-CURSO Lenovo rama feature/iconos-botones — lote 1: 21 migrados, ~307 restantes (mayoría no-UI a propósito), ver ESTADO-LENOVO-2026-08-14-NOCHE.md |
| T16 | UI | P1 | Tema Sólido/Cristal: superficies no-botón (tarjetas/modales/chips/nav) | index.html | EN-CURSO Opus rama feature/temas-app-wide |
| T17 | Launch | P0 | **AAB listo** para prueba cerrada Play (mañana 18:00) | build-aab-release.yml | VERIFICADO Lenovo — pipeline/scripts OK, versionCode automático de version.txt. Bloqueado SOLO en Inty: faltan 4 secrets ANDROID_* en GitHub + respaldar el keystore fuera de esta máquina. Nada más que hacer sin eso. |
| T18 | Launch | P0 | Sanidad de versión en 3 lugares cada release | index.html, version.txt, sw.js | recurrente |
| T19 | PWA | P2 | Verificar estrategia de caché offline end-to-end | sw.js | LIBRE |
| T20 | Obs | P2 | Verificar que Sentry capture errores reales en prod | index.html | LIBRE |
| T21 | UX | P1 | **Auditoría pantalla-por-pantalla** (sistemática, sin dejar detalle) | index.html | LIBRE (continua) |

## T21 — cómo hacer la auditoría end-to-end (para quien la tome)
Recorrer CADA pantalla y anotar hallazgos en un doc `AUDITORIA-PANTALLAS-*.md`:
esfera/inicio, mapa (capas, popups), registro/login, perfil, preferencias, logros/Darma,
Pistero/chat, grabar ruta, planificador, taller, ranking/comunidad, tutorial. Por pantalla:
(1) ¿una acción primaria clara? (2) íconos a medida (no emoji)? (3) contraste/legibilidad?
(4) estados de error/carga/vacío? (5) foco/teclado? (6) copy claro? (7) qué se puede quitar.
Cerrar cada hallazgo como tarea nueva (T22, T23…) en este backlog.

— Iniciado por Opus, 2026-08-14 (noche). Vivo: cualquier cuenta lo actualiza.
