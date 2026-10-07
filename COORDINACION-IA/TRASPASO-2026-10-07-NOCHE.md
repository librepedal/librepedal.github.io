# Traspaso 2026-10-07 (noche) — 8.810 publicada, sobrevuelo sin bici (8.811) y "Elige tu Pistero"

Para la cuenta que retome. Léelo entero antes de tocar nada. Reglas de siempre: `METODO-DE-TRABAJO-INTY.md`,
nunca cambiar de rama en `C:\Users\flgan\librepedal` (carpeta compartida): usar un worktree propio.

## 1) Qué quedó publicado
- **8.810 en producción** (merge `90ea0e2` en `main`, librepedal.cl/version.txt = 8.810, deploy Cloudflare y APK OK).
  Detalle de lo que trae: `TRASPASO-2026-10-07-RELEASE-8.810.md`.
- **Worker del sobrevuelo con D1** publicado por Inty (versión `84429018`, solo binding `DB`). Verificado con la traza
  sintética **muestreada como la app** (1 punto cada 40 m, 451 pts): 1.ª llamada `cache:false` valhalla 4/4 en 1,5 s,
  2.ª `cache:true` en 0,27 s. Ojo: mandar la traza cruda (1698 pts) da "parcial 4/15" y queda guardada en D1 (es sintética,
  no estorba); la app siempre muestrea antes.

## 2) Ramas listas, esperando el OK de Inty (NO están en main)
| Rama | Qué | Estado |
|---|---|---|
| `fix/ci-node22` (`a9d130c`) | El CI de tests usa Node 20 y `worker-sobrevuelo.test.mjs` usa `node:sqlite` (Node ≥ 22): por eso el run de tests de la 8.810 salió rojo. Sube `tests.yml` a Node 22. | Reproducido: Node 20 → 53/54, Node 22 → 54/54. Mergear re-despliega el mismo contenido. |
| `fix/sobrevuelo-sin-bici` (`1875532`, **v8.811**) | Sobrevuelo de respaldo (`sobrevuelo-viaje.js`, el que sale si el 3D no abre): Pistero como **rostro** del personaje elegido (`sb3CaraPersonaje` del 3D), **sin anillo**, **camino que brilla** (huella neón del 3D con colores de pendiente, `window.sb3Neon`), vuelven las reacciones del camino (¡Ojo, curva!, ¡Wiii!…), sin mascota ni su sonido. En el 3D: `SB3_MASCOTA=false`. | 55/55 tests; `tests/sobrevuelo-sin-bici.test.mjs` (11) falla 5/8 contra la 8.810 (detecta el error). Capturas a 390×844; punta del marcador a 2–3 px del camino. Inty dijo "ya está bien eso" pero **no dio OK explícito de publicar**: preguntar. Al publicar, versión ≥ 8.811 y re-correr tests. |

Worktrees de esta sesión: `C:\Users\flgan\librepedal-publicar` (detached en el merge de la 8.810 + rama `fix/ci-node22`)
y `C:\Users\flgan\librepedal-scroll2` (`fix/sobrevuelo-sin-bici`). Se pueden borrar después de mergear.

## 3) Pendientes abiertos con Inty
1. **Scroll en Perfil "se expande y se contrae"**: el video de Inty (15:58) mostraba la **versión anterior** (lista de
   la tienda con scroll propio y sobrevuelo antiguo con bici). En la 8.810, con dedo simulado: 14 pantallas + 16 pestañas
   de Perfil + Preferencias llegan al final, "Guardar personaje" completo. **Pedirle la versión** de Ajustes ("Libre Pedal · v…"
   junto a "Actualizar app"). Si dice 8.810 y sigue el problema → depurar en su teléfono por USB (chrome://inspect).
2. **El sobrevuelo 3D tiene anillo y halo que late** (`.cm-anillo`, `.cm-halo`). Inty dijo del anillo "eso nunca lo pedí"
   (lo dijo mirando el de respaldo). Preguntar si se saca también del 3D.
3. **Respaldo sigue el GPS crudo** (se separa un poco de la calle). Ofrecido: usar la línea pegada del 3D si ya existe
   (`lp_sbv3_pegadas` / worker). Sin respuesta.
4. **Orden barajado** de los modelos en "Elige tu Pistero" (para que ninguno gane por ir primero): sin confirmar.

## 4) Decisiones de Inty de hoy (todas obligatorias)
- **Pistero ya no va en bicicleta** en ninguna parte; va como rostro del personaje que eligió el usuario.
- **Sin anillo** alrededor de la cara ("eso nunca lo pedí"). **El camino brilla** (huella neón acordada).
- **Mascota = regalo sorpresa** al terminar el **primer viaje**, cuando el usuario empieza a revisar su recorrido en el
  teléfono. Fuera del sobrevuelo. Además: el usuario puede **mandar una foto de su mascota (o decir cuál quisiera) y se la
  diseñamos**. Recomendación aceptada: gratis en la prueba y con plazo visible. Por definir al diseñar: quién la diseña y
  plazo, privacidad de la foto (borrar ubicación/metadatos, no guardar caras de personas, permiso, reglas de Play).
- **Período de prueba con TODO el catálogo gratis**; con lo que la gente elija se decide qué modelos/piezas quedan.
  Hay que **medir desde el día 1** (conteos sin datos personales, mostrar a Inty antes de programar): primera elección,
  elegido hoy, días que lo mantienen, probado y descartado, km pedaleados con cada modelo.
- **Modelos en la prueba (6):** Cyberpunk, Orbe, Slime, Androide de vinilo, **Casco vivo** ("está bien trabajado, no vamos
  a perder eso", `disenos-ui/pistero-nuevo/vector/pistero-frente.js`) y **Clásico** (el actual). Vidrio entra cuando Inty
  apruebe `vidrio4-compacto.jpg` (marcado como "llegó después" en la medición).
- **Dónde se elige:** una pantalla al abrir la app por primera vez (estilo Finch) y después desde el Armario.

## 5) "Elige tu Pistero" — pieza 1 de 3 (en curso)
Orden acordado: 1) Elige tu Pistero → 2) armario por modelo (sus propios accesorios; fuera las pestañas humanas Piel/Pelo/
Cara/Aros y definir Bici/Pintura/Ruedas) → 3) entrega de la mascota (regalo + mascota personalizada).
- Referencias (Pokémon GO compañero, Duolingo, Memoji, Finch, maqueta vieja): https://claude.ai/artifact/2o6oxN885mmjx6VTRNKYkN
- **Maqueta tocable** con los 6 modelos reales animados: https://claude.ai/artifact/Vy68jqzscPQ5uQT7jy9mmR
- Fuentes: `disenos-ui/elige-tu-pistero/` (`node armar.cjs` regenera `maqueta.html` y `referencias.html` idénticas a lo publicado).
- Estado: Inty vio la maqueta; reportó "Orbe y Androide con problemas en la animación" → corregido en la versión 2 (abajo).
  **Falta su OK de la maqueta** antes de seguir con la pieza 2.

### Lecciones de la maqueta (aplicarlas al integrar en la app)
- No recortar (`overflow:hidden`) el recuadro de los modelos: el Orbe salta fuera de su viewBox y tiene sombra abajo.
  El Cyberpunk dibuja fuera de su viewBox (237 px de alto en 184): se achica solo a él (`scale(.76)`).
- Cada `crearXCapas` corre su `requestAnimationFrame` para siempre: pausar los que no están en pantalla (`__rafVisible`
  en `armar.cjs`). Medido: con 6 modelos tocados queda 1 solo ciclo (61 rAF/s).
- El recorte de fondo por canvas al crear cada modelo da un tirón en el teléfono: en la app usar **PNG ya recortados**.
- `width:min(372px,100%)` dentro de una columna de grilla `auto` deja el teléfono en 42 px de alto: dar ancho fijo con `max-width`.

## 6) Fuera de Libre Pedal (CIBER STAK)
Sin cambios hoy. Motor contable y app nueva en `C:\Users\flgan\ciberstak-motor-contable` (README): no publicada.
F29 de octubre vence el 20-11-2026. Régimen tributario: el README del motor dice informarlo antes del 02-11-2026 y el
CLAUDE.md global dice que se puede optar hasta la renta de abril 2027: confirmar en sii.cl antes de decidir.
