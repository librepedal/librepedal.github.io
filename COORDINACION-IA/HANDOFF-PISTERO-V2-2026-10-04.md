# 🧢 Traspaso — Pistero v2 (armario, tienda, bici, sobrevuelo) · 2026-10-04

Para la cuenta Claude que retome esto. Todo está **pusheado**; nada está en `main`.

## Dónde está
| Rama | Estado | Qué es |
|---|---|---|
| `feature/pistero-v2-armario` | ✅ lista, **espera ✓ de Inty** para mergear | Todo lo de Pistero (abajo) |
| `feature/ideas-fondo` | ⏸️ **aparcada** — Inty dijo que ese pedido fue un error de sesión | Ideas para el fondo en la bienvenida + votos de suscriptores. No mergear sin preguntarle; se puede borrar. |

Sincroniza y entra:
```bash
git fetch origin && git checkout feature/pistero-v2-armario && git pull --ff-only
node tests/run.mjs          # 44/45: el único rojo es iconos-lucide.test.mjs, que YA falla en main (no es de esta rama)
```
Galería visual de todo (mismo código de la app): `npx serve .` → `/disenos-ui/pistero-v2/galeria.html`.

## Qué se hizo (commits en la rama, en orden)
1. **Armario v2** (`pistero-armario.js`, nuevo): catálogo + piezas SVG, mismo formato de siempre (viewBox 0 0 100 84).
   ~257 opciones. **Pelo rehecho** (Inty: el moño con cola en gancho "no es lógico"): sale solo bajo el casco y cae con la gravedad; 12 peinados. `pelo:'mono'` viejo → `'cola'`.
2. **Todo independiente** (Inty: "el usuario puede elegir colores, accesorios, todo independiente"): casco = color (lista o **cualquier** color con `<input type=color>`) + acabado aparte (brillante, mate, metálico, perlado, carbono, neón). Color propio para accesorio, equipo, marco de lentes, aros, bici.
3. **Tienda** (`pistero-tienda.js`, nuevo): Pistero grande arriba, pestañas chicas (Casco, Diseño, Accesorios, Equipo, Lentes, Pelo, Cara, Aros, Cuello, **Bici**, Piel), cada una muestra solo lo suyo; filtro Gratis/Pro; tocar = **probar** sin guardar; rareza con marco (Común gris, Raro azul, Épico morado, Legendario dorado con brillo) y destellos en el Pistero si lleva algo épico/legendario. Arte "pro" con degradé/volumen/reflejos en corona, aureola, alas, unicornio, vikingo, punk, dino, hélice.
4. **Bici + sobrevuelo + su Pistero en toda la app**:
   - `pistero-bici.js` (nuevo): Pistero de lado pedaleando (rodilla con cinemática inversa, bielas y ruedas SMIL). 5 tipos: ruta, montaña, urbana, BMX, playera.
   - `sobrevuelo-viaje.js`: Pistero en su bici recorre la ruta; `_sbvAnalizar()` usa `t` y `alt` de cada punto → partida, subida (+m), cima, bajada, vel. máxima, pausas, llegada; globo de cómic con su cara en cada momento (máx. 7). Rutas sin hora/altura no inventan momentos.
   - `_pintarMiPistero()`: su Pistero en la pestaña Pistero (nav), avatar de cabecera y título de la sección. En el mapa los **otros** ciclistas se ven con su Pistero real (`pistOpts` del doc `users`, cero lecturas extra).

## Datos y seguridad (no romper esto)
- Se guarda en `localStorage lp_pist_<cu>` y en `users/{cu}.pistOpts` (mapa completo) + campos sueltos `pist*` para clientes viejos.
- `_pistNormal()` (armario) **acepta solo valores del catálogo o `#rrggbb`**: `pistOpts` de otros usuarios se inserta tal cual en el SVG → es la barrera anti-inyección. Hay test para eso.
- Tienda: `TIENDA_COBRO_ACTIVO=false` → todo usable + aviso "Lanzamiento". Con `true`, lo no-común solo se equipa si está en `us.armario` (lista `'clave:id'`), que debe escribir **solo** un worker de compras (como `us.premium`); `_ptLimpiar()` en `_pistGuardar` lo garantiza en el cliente. **Falta**: regla Firestore que impida al cliente escribir `armario` (copiar el patrón `premiumSinTocar()`), Google Play Billing en Android (obligatorio para bienes digitales, comisión 15%) y el worker.
- Precios propuestos (CLP): Común gratis · Raro $490 · Épico $990 · Legendario $1.990. Identidad (piel, ojos, peinados, pelo natural, pestañas, labial), seguridad (luz, reflectante, visera) y colores libres: **siempre gratis**. Rarezas en `PIST_TIER` (pistero-tienda.js). **Inty no ha confirmado precios.**

## Tests nuevos
`pistero-armario.test.mjs` (1377), `pistero-tienda.test.mjs` (168), `sobrevuelo-bici.test.mjs` (31). Corren el código real en `vm`.

## Pendiente / siguiente paso
1. **✓ de Inty** viendo la rama (ideal en su teléfono). Merge = deploy automático.
2. **Versión**: la rama dice **8.805** (`APP_VERSION`, `version.txt`, `sw.js`). Otra sesión dejó **8.804** en `fix/google-signin-a-main` sin mergear → si esa entra primero, conflicto trivial en esos 3 lugares; subir a la que corresponda al mergear.
3. Probar el sobrevuelo con una **ruta real grabada** en el teléfono (solo se probó con ruta sintética en el navegador).
4. Ideas que quedaron sobre la mesa: packs temáticos, "nuevo" en piezas recién agregadas, más arte pro en diseños épicos (llamas/tigre/camuflaje), que la bici se vea también en el marcador propio durante la navegación.
5. Si el cobro se activa: regla Firestore para `armario` + worker + Play Billing (ver arriba).

## Lecciones de esta sesión
- Los archivos tienen **CRLF mezclado**; `git checkout` de rama los reescribe con CRLF. Al editar con scripts, normalizar o usar `\r?\n` en las búsquedas.
- El contenedor `main` tiene `overflow:auto` sin alto fijo → `position:sticky` **no funciona** dentro de las vistas. Por eso la tienda usa lista con scroll propio en vez de cabecera fija.
- Al probar en el navegador local, el service worker sirve JS viejo: desregistrarlo y limpiar `caches` antes de recargar.
- El gate de calidad (`scripts/gate-calidad.mjs`) bloquea `catch(e){}` vacíos en líneas tocadas: poner `console.warn` o `/* gate:permitido <motivo> */`.
