# SPEC — Temas de UI app-wide (Sólido / Cristal) · 2026-08-14

**Estado:** EN CURSO en la rama `feature/temas-app-wide` (NO en `main`, para no
disparar el deploy automático a producción con algo a medias). Retomar desde ahí.

**Aprobado por Inty** (mockups en `disenos-ui/modelo-a-solido.html` y
`disenos-ui/modelo-b-cristal.html`; alcance en `disenos-ui/README-DISENOS.md`).
Es la feature #1 del plan post-lanzamiento; se termina AL 100% antes de pasar a la
siguiente (mapas videojuego → logros ocultos+voz → íconos Lucide) y recién con todo
en orden se arma el **AAB final** para la prueba cerrada de Google Play.

---

## 0-bis. Estado de `main` al momento del handoff (2026-08-14 ~09:15)
La otra cuenta mergeó su trabajo local a `main` → `origin/main` = `c65e8f0` (~33 commits
nuevos, NINGUNO toca `index.html`; main sigue en `APP_VERSION 8.51`). **Mi rama forkeó de
`4830804` y NO tiene conflicto** con eso (index.html idéntico en ambos lados). Al retomar:
`git fetch && git rebase origin/main` sobre `feature/temas-app-wide` → limpio. Luego seguir.

## 0. Regla de oro de esta feature
- **NO pushear a `main` hasta que esté completa y validada** (push a main = deploy a
  librepedal.cl, que ya está en v8.51 estable). Trabajar y pushear en
  `feature/temas-app-wide`. La rama NO dispara el workflow (solo `main` lo hace).
- Candado `EN-USO.md`: tomarlo antes de editar `index.html`, liberarlo al terminar.
- Al terminar cada versión: subir versión en los 3 lugares, `node validate.js`,
  probar en navegador local, commit + **push de la rama** (no de main).

## 1. Qué se construye
Dos temas de superficie elegibles por el usuario, **app-wide**:
- **Sólido** (= look actual v8.51, opaco con profundidad). Es el DEFAULT. Cero cambio
  para quien no toca nada.
- **Cristal** (transparencias + `backdrop-filter:blur` sobre el fondo postal). Ver
  `modelo-b-cristal.html` para los valores exactos.

El tema debe reestilizar TODAS las superficies (botones, tarjetas, modales, esfera de
apps, chips, overlays del mapa, nav, formularios, Darma, logros), no solo pantallas de
muestra (pedido explícito de Inty: "esto va a TODA la app").

## 2. Arquitectura (espejar el patrón `actividad` que YA existe)
El sistema de "actividad" en `index.html` (~línea 2087-2127) es la plantilla exacta:
guarda en localStorage + Firestore, aplica con una función, tiene selector con grid.
Copiar ese patrón:

### 2.1 Estado + persistencia
- Clave localStorage: **`lp_tema_ui`** = `'solido'` | `'cristal'` (default `'solido'`).
- Variable global: `let temaUI = localStorage.getItem('lp_tema_ui')||'solido';`
- Firestore: campo `temaUi` en `users/{cu}` (merge), igual que `actividad`:
  `db.collection('users').doc(cu).set({temaUi:id},{merge:true})`.
- Al cargar el perfil desde Firestore (buscar donde se lee `actividad` del doc del
  usuario y se llama a `elegirActividad(...,true)`), leer `temaUi` y llamar
  `elegirTemaUI(temaUi, true)` para que el tema siga al usuario entre dispositivos.

### 2.2 Aplicación (clase en body, NO estilos sueltos)
```js
function _aplicarTemaUI(){
  document.body.classList.remove('tema-solido','tema-cristal');
  document.body.classList.add('tema-'+temaUI);
}
function elegirTemaUI(id, silencioso){
  if(id!=='solido' && id!=='cristal') return;
  temaUI=id; try{ localStorage.setItem('lp_tema_ui',id); }catch(e){}
  if(cu){ try{ db.collection('users').doc(cu).set({temaUi:id},{merge:true}).catch(function(){}); }catch(e){} }
  _aplicarTemaUI();
  renderTemaUIGrid();               // refresca el selector (marca el elegido)
  if(!silencioso) h('Tema '+(id==='cristal'?'Cristal':'Sólido')+' aplicado.');
}
```
- Llamar `_aplicarTemaUI()` **una vez al arrancar** (junto a `_aplicarTemaActividad()`),
  para que la clase esté puesta desde el primer render y el switch sea instantáneo.
- IMPORTANTE (FOUC): poner la clase lo antes posible. Ideal: un `<script>` inline
  mínimo al inicio del `<body>` que lea `localStorage.lp_tema_ui` y ponga la clase,
  para evitar parpadeo Sólido→Cristal en el arranque.

### 2.3 CSS — tokens de superficie + overrides por tema
Sólido = valores actuales (no tocar los componentes). Cristal = capa de override.
Dos formas combinables:

**(A) Tokens de superficie en `:root`** (para las superficies que se refactoricen a
token). Añadir a `:root` (línea 43):
```css
:root{ /* ...existentes... */
  --surf:#141a2b;              /* fondo de tarjeta/panel sólido actual aprox */
  --surf-2:#0f1524;            /* fondo secundario/hundido */
  --surf-br:rgba(255,255,255,0.09);  /* borde de superficie */
  --surf-blur:0px;            /* Sólido: sin blur */
}
body.tema-cristal{
  --surf:rgba(255,255,255,0.055);
  --surf-2:rgba(255,255,255,0.03);
  --surf-br:rgba(255,255,255,0.13);
  --surf-blur:14px;
}
```
Y donde una superficie se migre, usar `background:var(--surf)`, `border-color:var(--surf-br)`,
`-webkit-backdrop-filter:blur(var(--surf-blur)) saturate(1.25); backdrop-filter:...`.

**(B) Overrides directos `body.tema-cristal .clase{...}`** para superficies que NO se
migren a token (más rápido, menos invasivo). Ej:
```css
body.tema-cristal .trip-card{
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.12);
  -webkit-backdrop-filter:blur(14px) saturate(1.3); backdrop-filter:blur(14px) saturate(1.3);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.15),0 10px 30px -10px rgba(0,0,0,.6);
}
```
Recomendación: usar (A) para el puñado de superficies más repetidas y (B) para el
resto, en lotes con preview en navegador. Copiar valores glass del
`modelo-b-cristal.html` (`.glasspanel`, `.gb`, `.darma-glass`, `.lg-item`, `.pistero`).

### 2.4 Rendimiento (crítico en móvil)
`backdrop-filter` es caro. Reglas:
- Aplicarlo SOLO a superficies estáticas visibles; NUNCA a listas largas con muchísimos
  items simultáneos ni a overlays del mapa que se repintan cada frame (ahí usar
  translucidez SIN blur, o blur muy bajo).
- Respetar `@media (prefers-reduced-motion:reduce)` (ya existe al final del mockup).
- Considerar un fallback: `@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)))`
  → en Cristal usar fondos semi-opacos sólidos (sin blur) para no dejar texto ilegible.
- Probar en el teléfono real de Inty antes de dar por cerrada la feature.

## 3. Selector en Perfil/Preferencias (con preview)
- Ubicación: pantalla de Preferencias, cerca del selector de modo/actividad. Buscar
  `renderActividadGrid` y su contenedor `actividadGrid` para el patrón de markup
  (`.custom-option`, `.check`, `.selected`).
- Markup del grid de tema: 2 opciones (Sólido, Cristal), cada una con un mini-preview
  visual (un chip/tarjeta de muestra con el tratamiento del tema) + label.
- `onclick="elegirTemaUI('solido')"` / `'cristal'`.
- `renderTemaUIGrid()` marca `.selected` en la opción activa (== `temaUI`).
- Añadir un `<div id="temaUIGrid">` en el HTML de Preferencias y llamar
  `renderTemaUIGrid()` al abrir esa pantalla (donde se llama `renderActividadGrid()`).

## 4. Inventario de superficies a revestir (Cristal)
Barrido inicial (multi-línea, revisar cada una en el CSS real). Priorizadas por impacto:

**Lote 1 — navegación y contenedores primarios (hacer primero, validar):**
- barra de navegación inferior (buscar la nav fija; `padding-bottom:70px` en body la delata)
- `.trip-card`, `.hero-viaje` / tarjetas de viaje/inicio
- botones `.ab`, `.ab.sec`, `.bg`, `.bd`, `.mb` (ya pulidos en Sólido v8.51)
- Darma badge `.darma-badge` (versión vidrio dorado → ver `.darma-glass` del mockup)

**Lote 2 — modales y overlays:**
- modales genéricos (`.user-list-modal`, y el/los contenedor(es) modal base)
- `.stat-card`, `.chart-container`, `.section-info`, `.vinfo`
- chips: `.uchip`, `.tab-pill`, `.chip*`
- esfera de apps: paneles/tarjetas dentro de `#esferaScreen`

**Lote 3 — mapa y resto:**
- overlays del mapa (con translucidez SIN blur pesado, ver 2.4)
- formularios / inputs, `.secret-form`, `.added-dest-item`, `.route-history-item`
- speech-bubble / Pistero (`.speech-bubble`) → ver `.pistero` del mockup
- logros (`mostrarLogros`): en Cristal, `.lg-item` glass (ver mockup)

Comando para localizar cada clase: `grep -nE '\.CLASE\b' index.html`.
NOTA: el grep de conteo inicial sub-cuenta reglas multi-línea; revisar el CSS real.

## 5. Versión + validación + entrega
1. Subir versión en los **3 lugares**: `APP_VERSION`, `version.txt`, `sw.js` (cache `vNNN`).
   Próxima sería **v8.52**.
2. `node validate.js` → 0 errores.
3. Cargar `index.html` en navegador local: probar el switch Sólido↔Cristal en vivo,
   revisar TODAS las pantallas (nav, viaje, esfera, mapa, perfil, logros, modales),
   legibilidad del texto sobre cristal, rendimiento del scroll.
4. Probar en el teléfono real de Inty (obligatorio para cerrar).
5. Commit + **push de la rama** `feature/temas-app-wide`.
6. Cuando Inty apruebe: `git checkout main && git merge feature/temas-app-wide` →
   push a main → deploy automático (~40s) → verificar `version.txt` en librepedal.cl.

## 6. Preguntas abiertas para Inty (no bloquean el scaffold)
- Cristal: ¿intensidad del blur (12-16px) y cuánta translucidez? (Se puede dejar el
  del mockup y afinar viéndolo.)
- ¿El fondo postal (`#fondoPostal`) debe estar SIEMPRE activo en Cristal para que el
  vidrio tenga algo bonito detrás, o respeta la config actual del usuario?
- ¿Preview del selector = mini-tarjeta de muestra, o aplicar el tema a toda la app al
  instante al tocar (preview en vivo, sin confirmar)? Recomiendo preview en vivo.

## 7. Estado de avance (actualizar al retomar)
- [x] Rama `feature/temas-app-wide` creada.
- [x] SPEC escrito (este archivo).
- [x] Scaffold: tokens `:root` + `body.tema-cristal` + `_aplicarTemaUI`/`elegirTemaUI`
      + anti-FOUC. (commit del scaffold)
- [x] Selector en Preferencias ("Estilo de interfaz") + `renderTemaUIGrid` + mini-preview
      `.tema-prev` + carga de `_prevData.temaUi` desde Firestore. Tests 12/12 verdes.
- [ ] **Lote 1 de superficies (nav, tarjetas, botones, Darma)** ← SIGUIENTE. OJO: hoy
      Cristal NO tiene efecto visible porque ningún componente consume `--surf*` todavía.
      Preview del look aprobable: `preview-temas.html` (superficies leyendo `--surf*`).
      Estrategia probada en ese preview: que cada superficie use
      `background:var(--surf);border-color:var(--surf-br);backdrop-filter:blur(var(--surf-blur));box-shadow:var(--surf-sh)`.
- [ ] Lote 2 (modales, chips, esfera).
- [ ] Lote 3 (mapa, formularios, Pistero, logros).
- [ ] Versión v8.52 + validate + prueba navegador + prueba teléfono.
- [ ] Aprobación de Inty → merge a main → deploy.
