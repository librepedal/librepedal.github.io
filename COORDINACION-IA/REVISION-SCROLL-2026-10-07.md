# Revisión de scroll y botones cortados — 2026-10-07

Pedido de Inty: "el scroll no baja en perfil, los botones a veces no se ven completos, el scroll no se hace bien".
Rama: `fix/scroll-perfil-botones` (sale de `main` 8.807). **No sube versión ni está mergeada.**

## Cómo se probó
- La app servida en local (estático) y abierta con Chrome sin ventana (playwright-core) en **390x844, 360x640 y 412x915**,
  con agente de teléfono Android y pantalla táctil.
- Sin cuenta: se quitó la pantalla de login con JS en la página (`lp-sin-sesion`) y se abrió cada vista con `cv(...)`.
  **Toda la red externa quedó bloqueada** salvo librerías (Firebase SDK, íconos, fuentes): cero lecturas o escrituras en Firebase.
- Por cada vista: alto de la página contra alto de pantalla, si la **rueda/gesto desde el 75 % de la pantalla llega al fondo**,
  scrolls anidados, y controles tapados por la barra de abajo o la cara de Pistero. Capturas revisadas a ojo.
- El gesto táctil sintético de Chrome no mueve nada en modo sin ventana (ni en una página vacía), así que el gesto se probó con
  rueda del mouse, que sigue las mismas reglas de "a qué caja le toca el scroll" que el dedo.

## Problemas encontrados

| # | Pantalla | Síntoma | Causa raíz | ¿Arreglado? | Cómo se verificó |
|---|---|---|---|---|---|
| 1 | **Perfil** (tienda de Pistero) | El perfil no baja. Deslizando sobre la lista de piezas la página queda quieta; "Preferencias" y "Guardar personaje" no se alcanzan. | `.pt-panel` (estilos.css, ex-l.974) tenía scroll propio (`max-height:calc(100dvh - 330px)`, `overflow-y:auto`) **con `overscroll-behavior:contain`**: atrapa el gesto aunque la lista sea corta (pestaña Casco: 432px de contenido en caja de 514px → el gesto se pierde entero). | **Sí** | Antes: rueda desde el 75 % → scrollY **0** de 445 (390x844), 0 de 374 (412x915), 200 de 543 (360x640). Después: llega al fondo en los 3 tamaños; "Guardar personaje" queda entero sobre la barra (390: 704–748 con barra en 775; 360: 500–544 con barra en 571). |
| 2 | Perfil | Las tarjetas de la tienda quedaban cortadas por la barra de abajo. | Misma caja de alto fijo del #1. | **Sí** | Capturas `perfil-mid` / `perfil-fin`. |
| 3 | **Social** | Lo de abajo ("Aportar", "Recomendaciones") quedaba bajo la barra y la cara de Pistero; había dos scrolls (página 21px + `<main>` por dentro). | `#v-chat` compartía el alto fijo de "Pregúntale a Pistero" (`height:calc(100dvh - 130px)`), pero tiene el chat de 280px **más 5 grupos debajo**: el contenido se salía de la caja y `<main>` (con `overflow-y:auto`) se volvía un segundo scroll (734 de alto con 842 de contenido). | **Sí** | Después: un solo scroll (0 anidados), página 1141px, el último grupo termina sobre la cara de Pistero (captura `chat-390x844`). |
| 4 | Todas | `<main>` era un contenedor de scroll que casi nunca scrolleaba, pero se "comía" gestos en Social y hacía imposible `position:sticky` (por eso la tienda inventó su propia lista con scroll). | `main{overflow-y:auto}` con `body` sin alto fijo. | **Sí** (venía de la rama `fix/scroll-y-botones`, 5215ef1) | Ninguna vista tiene ya scroll anidado salvo cajas de texto y el chat (que es a propósito). |
| 5 | Pregúntale a Pistero | La página tenía 21px (390/412) o 37px (360) de scroll de sobra; la caja de escribir bajaba un poco al tocarla. | Alto fijo con 130px "mágicos" que no coinciden con la cabecera real (61px, o 77px cuando el logo se partía en 2 líneas en 360) ni con la barra. | **Sí** | Alto = pantalla − cabecera medida − barra medida − 20 (`layout-medidas.js`, de 5215ef1). Después: página = pantalla exacta en los 3 tamaños, caja de escribir sobre la barra (360: termina en 553, barra 571). |
| 6 | Cabecera en 360px | El logo se partía en "LIBRE / PEDAL" y la cabecera crecía de 61 a 77px. | Sin `white-space:nowrap`. | **Sí** (de 5215ef1) | Medido: botones de la cabecera dentro de la pantalla. |
| 7 | Pestañas de la tienda | La tira de pestañas podía atrapar el gesto vertical. | `overflow-x:auto` sin `overflow-y:hidden`. | **Sí** (de 5215ef1) | — |
| 8 | Modal de perfil/listas (`#userModal`: perfil de comunidad, amigos, ranking, logros…) | Al llegar al final del modal, el gesto seguía y movía la página de atrás. Sin margen para la barra de estado ni la barra de gestos del teléfono (la app usa `viewport-fit=cover`). | Sin `overscroll-behavior` y `padding:15px` fijo. | **Sí** | Con 30 filas en 360x640: el modal llega a su final (último botón 581–625 dentro de pantalla) y la página de atrás queda en 0. Al cerrar, la página sigue scrolleando normal (no queda bloqueada). |
| 9 | Perfil | ~160px vacíos bajo "Guardar personaje". | El colchón de 148px de `.view` es para no quedar bajo la cara de Pistero, pero en Perfil la cara está oculta. | **Sí** | Ahora queda ~27px sobre la barra. |

### Lo que la rama anterior `fix/scroll-y-botones` (5215ef1) hacía y qué cambié
Se reutilizó (no se duplicó): `main` sin scroll, tira de pestañas, `layout-medidas.js`, logo en una línea. **Sin** su subida a 8.808.
Dos cosas **no** se tomaron:
- Su `body{padding-bottom: barra + 96px}`: se sumaba a los 148px que ya da `.view` → ~300px vacíos al final de cada pantalla.
  Medido: sin eso, lo último de cada pantalla ya queda sobre la cara de Pistero en los 3 tamaños.
- Su lista de la tienda sin scroll propio hacía que Pistero y las pestañas se fueran para arriba al recorrer piezas. En vez de eso,
  **la cabecera de la tienda (Pistero + pestañas) queda fija arriba con `position:sticky`** sobre el scroll de la página: se ve igual
  que el diseño aprobado, pero hay un solo scroll y al terminar la tienda la página sigue hasta Preferencias y Guardar.
  En pantallas de menos de 600px de alto se desactiva (dejaría muy poca lista a la vista).
  `fix/perfil-volver-customize` ya está en `main` (no había nada que tomar).

### Revisado y sin problemas
Inicio, Música, Ajustes, Rutas, Nuevo viaje, Diario, Recomendaciones, Novedades, Mantención, Guía, Estadísticas, Mapa,
Esfera (botones dentro de la pantalla), pantalla de login (en 360x640 "Entrar con Google" queda bajo el borde pero se alcanza
con scroll), `bienvenida.html`. No hay ningún código que deje el `body` con `overflow:hidden` pegado.

## Lo que NO se pudo probar
- **Teléfono real** (dedo real, barra de gestos de Android, notch). Chrome sin ventana no simula el dedo; se usó la rueda.
- **App de Play (Capacitor/WebView):** no sé si ahí `env(safe-area-inset-*)` da valores reales; los márgenes nuevos usan `env()` igual
  que la cabecera, y si da 0 no cambia nada.
- **Teclado abierto** en "Pregúntale a Pistero" (hay un arreglo viejo con `visualViewport` en index.html, al final; no se tocó).
- Pantallas que necesitan cuenta y datos: perfil de comunidad con datos reales, amigos, ranking (se probó el modal con contenido falso).
- Tema "Cristal": la franja fija de la tienda usa el mismo fondo oscuro de la cabecera; no se revisó en Cristal.

## Qué debe probar Inty en su teléfono (antes de publicar)
1. **Perfil:** deslizar con el dedo sobre la lista de piezas → debe bajar toda la página hasta "Guardar personaje". Pistero y las
   pestañas deben quedar arriba mientras recorre las piezas. Probar con una pestaña corta (Casco) y una larga (Accesorios).
2. **Social:** bajar hasta "Aportar" y abrirlo: "Recomendaciones" debe verse entero, sobre la barra.
3. **Pregúntale a Pistero:** la caja de escribir sobre la barra, sin que la página se mueva; abrir el teclado y escribir.
4. **Ver mi perfil de comunidad** (y Amigos/Ranking): bajar hasta el final; la página de atrás no debe moverse; la X de arriba entera.
5. Al publicar: subir versión en los 3 lugares (se agregó `layout-medidas.js` a la lista del caché de `sw.js`, así que el número de caché tiene que cambiar).

## Revisión con el dedo (2026-10-07, tarde) — `herramientas/revision-dedo/`
Toques reales de Chrome a 390×844, todo desplegado, dedo a la izquierda/centro/derecha:
| | `main` (producción) | esta rama |
|---|---|---|
| Perfil, 16 pestañas de la tienda | **trabado en 0**, "Guardar personaje" cortado bajo la barra | llega al final, botón completo |
| Perfil, Preferencias | **no se alcanza** | se abre tocándola y llega al final |
| Social | se traba con el dedo sobre los accesos rápidos (izquierda) | llega |
| Otras 12 pantallas | llegan | llegan |
Sin errores de página. No probado: con datos reales de una cuenta (listas largas de viajes, chat con muchos mensajes)
ni en el teléfono de Inty. Ventanas sueltas (Amigos, Ranking, perfil de comunidad) quedan para la revisión de botones.
