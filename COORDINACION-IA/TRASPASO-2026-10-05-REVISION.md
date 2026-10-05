# Traspaso 2026-10-05 — revisión de punta a punta (rama `feature/armario-piezas`, v8.809)

Pedido de Inty: "revisa con ojos nuevos de punta a punta… quiero todo funcionando, que nada quede
sin cumplir con lo que promete". Todo está en la rama `feature/armario-piezas` (incluye
`fix/scroll-y-botones`), pusheada y **fast-forward limpio sobre `main` (327f253)**. Tests 50/50,
gate limpio, sin errores de JS en 15 vistas (detector con control positivo).

## Qué se arregló
- **Armario:** cada pieza se muestra sola (lentes solo lentes, casco solo casco, etc.;
  `pistero-piezas.js`) y se monta en el Pistero de la vista previa, que queda fija arriba al bajar.
  6 lentes de ciclismo aprobados (Escudo, Radar, Sin marco, Media montura, Marco completo,
  Fotocromáticas); ids viejos se migran solos. Tests: `lentes-geometria`, `pistero-piezas`.
- **Un solo Pistero en pantalla:** vive en la barra de abajo; en el Mapa la cara flotante es un
  micrófono. El Pistero viejo en bici (emoji) que cruzaba la pantalla ya no existe: ahora el de la
  barra hace una travesura.
- **Scroll:** la página entera hace scroll (no cajas con scroll dentro); la caja de escribir de
  Pregúntale a Pistero y Social queda sobre la barra (alturas medidas con `layout-medidas.js`).
- **Descargas en la app de Android:** el WebView ignoraba `<a download>` y la app decía "Ruta
  exportada" sin entregar nada. Ahora `entregar-archivo.js` (Filesystem + Share) — GPX, respaldo,
  resumen anual, video de ruta, CSV admin. **Necesita AAB nuevo** con `@capacitor/filesystem` y
  `@capacitor/share` (ya en package.json); en instalaciones viejas avisa la verdad.
- **Textos que prometían de más:** privacidad (voz en la nube, Sentry, sin "eliminar en la app"),
  términos, ficha de Play (`PLAY-STORE-LISTING.md`, hay que pegarla en Play Console),
  `como-funciona.html` reescrita.
- **Esfera:** ya no se abre sola encima de otra pantalla tras el saludo (solo si sigue en Inicio).
- **Chat de Pistero:** el globo de subtítulos y "Instalar app" ya no tapan la caja de escribir.

## Para publicar (lo hace Inty; Claude no puede pushear a main)
```
git -C "C:\Users\flgan\lp-audit" push origin feature/armario-piezas:main
```
Luego `curl -s https://librepedal.cl/version.txt` → `8.809`. Después: AAB nuevo que incluya
`fix/google-signin-a-main` + los plugins de archivos.

## Decisiones pendientes de Inty (no se tocaron sin su OK)
1. ✅ (Inty, 2026-10-05) Beneficios de fundador: se quitaron "acceso anticipado" y "prioridad en sorteos"
   (no existían). Quedan los reales: insignia y doble Darma.
2. ✅ (Inty, 2026-10-05) Landing: "sin cuentas premium" → "lo esencial (mapa, navegación, SOS y comunidad) es
   gratis"; se sacó la tarjeta de la imagen para Instagram hasta que exista; textos de público sin "Chile"
   (quedan los datos de ley chilena del metro y medio y "Hecho en Chile").
3. "Comunidad segura" (Play exige para contenido de usuarios): borrar cuenta y contenido propio
   dentro de la app, reportar y bloquear. Necesita mockup.
4. SOS queda a medias bajo la barra en el primer vistazo de Inicio: propuesta de layout.
5. Armario: tarjetas compactas y navegación en 3 grupos del mockup v3 (`disenos-ui/armario-v3/`,
   sin commitear) aún no implementadas.
