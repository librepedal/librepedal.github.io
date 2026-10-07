# Traspaso 2026-10-07 — Versión 8.810 lista para publicar (rama `release/8.810`)

Inty aprobó publicar la 8.810 ("sí") y pidió **dejar todo listo para que lo tome otra cuenta**. La rama está integrada
y probada; falta solo publicarla y verificarla. **No está en `main`.**

## Qué trae (6 ramas, sin conflictos al juntarlas)
| Rama | Qué arregla | Detalle |
|---|---|---|
| `fix/scroll-perfil-botones` | Perfil vuelve a bajar hasta el final (en `main` está trabado en las 16 pestañas) | `REVISION-SCROLL-2026-10-07.md` |
| `fix/voces-navegando` | Las voces ya no se pisan navegando con señal débil (266 de 800 viajes simulados → 0 de 2000) | regla en `METODO-DE-TRABAJO-INTY.md` |
| `fix/botones-revision` | 11 botones sin señal ya no quedan trabados/mudos; aviso si falla el micrófono | `REVISION-BOTONES-2026-10-07.md` |
| `fix/ocultar-bluetooth-app` | "Sensores Bluetooth" oculto donde no hay Bluetooth web (app de Play) | |
| `fix/invitar-dominio` | Invitar y tarjeta "Mi año" con librepedal.cl | |
| `feature/sobrevuelo-3d-app` | Sobrevuelo 3D nuevo (con respaldo al de siempre) + worker que pega cada ruta una vez | `TRASPASO-2026-10-07-SOBREVUELO-3D-APP.md` |

Versión 8.810 en los 3 lugares (APP_VERSION, version.txt, caché `librepedal-v8810` con `layout-medidas.js` y
`sobrevuelo-3d.js`). **Ojo:** `feature/armario-piezas` usa 8.809 y `fix/scroll-y-botones` 8.808 → después de esta
publicación, cualquier rama nueva debe subir a **8.811 o más**. `fix/scroll-y-botones` quedó superada por
`fix/scroll-perfil-botones` (A hace todo lo de B y más, medido): no mergearla; borrarla solo con OK de Inty.

## Probado en esta rama (2026-10-07)
- `node tests/run.mjs` → **54/54**. Sintaxis de todos los .js OK.
- Chrome 390×844, producción bloqueada: scroll con el DEDO llega al final en las 14 pantallas y en Perfil
  (16 pestañas + Preferencias); sin errores de página (`herramientas/revision-dedo/`).
- Sobrevuelo 3D: abre desde el historial, pega al camino, cierra dejando el mapa intacto, ruta corta → el de siempre.
- No probado: el teléfono de Inty / app de Play (ver lista abajo) ni datos reales de una cuenta.

## Pasos para quien lo tome (en orden)
1. Latido: `git fetch origin && git log --oneline -3 origin/main`. Si `main` avanzó desde `327f253`, mergear `main`
   en `release/8.810`, revisar la versión (debe quedar mayor que lo que haya en main) y volver a correr los tests.
2. Publicar (Inty ya dio el OK):
   ```bash
   git checkout main && git pull --ff-only origin main
   git merge --no-ff release/8.810 && git push origin main
   ```
   El deploy es automático (`.github/workflows/deploy-cloudflare.yml`). **Revisar la pestaña Actions** (en agosto el
   token falló una vez) y después: `curl -s https://librepedal.cl/version.txt` → debe decir `8.810`.
3. **Worker del sobrevuelo con D1** (Inty debe correrlo, Claude no tiene permiso de desplegar). En PowerShell:
   `cd <repo>\worker-sobrevuelo; npx.cmd --yes wrangler@4 deploy` (si pide autorización: "Authorize" en el navegador).
   La base D1 `librepedal-sobrevuelo` (id 37c49c88-…, región ENAM) YA está creada con el esquema aplicado.
   Hoy sigue publicada la versión con KV (funciona igual); hasta publicar, el sobrevuelo usa el KV. Verificar con la
   traza sintética (`COORDINACION-IA/mapa-navegacion/sobrevuelo-3d/traza-gps.json`, nunca rutas de usuarios):
   1.ª vez `cache:false`, 2.ª `cache:true`, y en D1 `SELECT COUNT(*) FROM rutas` > 0.
4. **Pruebas en el teléfono de Inty** (con la 8.810 cargada):
   - Perfil: bajar hasta "Guardar personaje" en varias pestañas de la tienda y con Preferencias abierta.
   - Navegar con voz: que ninguna frase se encime (mejor con señal débil).
   - Modo avión: reportar un peligro → "quedó guardado"; al volver la señal aparece en el mapa.
   - SOS en la app de Play: "133" abre el marcador (NO llamar) y un contacto (él mismo) abre WhatsApp.
   - Ajustes en la app de Play: no aparece "Sensores Bluetooth".
   - Sobrevuelo 3D desde el historial con un viaje real.
   Si algo falla: `git revert -m 1 <commit del merge>` en una rama, tests, y mergear (nunca push directo sin tests).

## Pendiente después
- Vidrio (cuando Inty apruebe la forma `vidrio4-compacto.jpg`), mascotas (cuando Inty quiera), Pistero nuevos en
  el sobrevuelo cuando lleguen a `main` (código en `feature/sobrevuelo-3d`), compartir en redes (`feature/compartir-redes`,
  solo prototipos: necesita aprobación de diseño).
- Detalle sin arreglar: la tarjeta "Mi año" usa emojis (regla: íconos a medida); Pistero "Ver descripción" ok.
- Memoria de esta sesión: la cuenta de Inty en esta máquina guarda notas en `.claude/projects/.../memory/`.
