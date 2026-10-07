# Revisión con el dedo (scroll y botones)

Inty, 2026-10-07: "el scroll debe llegar hasta el final de cada pestaña y el usuario debe ver los botones completos
para apretar; en perfil no permite seguir bajando". Estas dos herramientas lo prueban como una persona: **solo con el
dedo** (toques reales de Chrome vía CDP, no `scrollTo`), a 390×844, con Firebase/workers/librepedal.cl bloqueados.

- `pantallas.mjs <carpeta del repo> [vistas...]` — las 14 pantallas, todo desplegado. Baja con el dedo apoyado a la
  izquierda, al centro y a la derecha; dice dónde se traba y qué hay bajo el dedo; al fondo, qué botones quedan
  tapados por la barra o la cara de Pistero, cortados a los lados o inalcanzables. `FOTOS=1` guarda capturas.
- `perfil.mjs <carpeta del repo>` — Perfil completo: cada una de las 16 pestañas de la tienda y Preferencias
  abierta tocándola; en cada caso, ¿llega al final? ¿"Guardar personaje" se ve completo?

Requisitos: Chrome instalado en `C:/Program Files/Google/Chrome/Application/chrome.exe` y `npm i --no-save playwright-core`.
Usan una sesión de PRUEBA solo en ese navegador (ocultan el cuadro de inicio de sesión): no tocan datos reales.

Trampas que ya costaron (no repetir):
- `Input.synthesizeScrollGesture` no mueve la página en Chrome sin pantalla: usar `Input.dispatchTouchEvent`.
- Perfil es un acordeón (`_perfilAcordeon`): forzar todos los `<details>` abiertos los cierra; abrir tocando.
- Los botones dentro de un `<details>` cerrado tienen posición pero no se ven: no contarlos.

Resultado 2026-10-07: `main` → Perfil trabado en 0 en las 16 pestañas ("Guardar personaje" cortado, Preferencias
inalcanzable) y Social trabado con el dedo sobre los accesos rápidos. Rama `fix/scroll-perfil-botones` → todo llega.
