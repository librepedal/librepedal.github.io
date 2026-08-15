# ESTRATEGIA DE VOZ — presupuestar ElevenLabs (Creator) + genéricas para el resto

**Aprobado por Inty 2026-08-14.** Plan ElevenLabs confirmado: **Creator ($22/mes = 100.000 caracteres/mes)**.
Entregable visual: `disenos-ui/economia-voz.html`.

## La misión (palabras de Inty)
"Ya pagamos ElevenLabs, así que planeamos las voces que tenemos de ellos y usamos nuestras
voces más genéricas para no gastar tanto token." → **Repartir la cuota mensual**: premium
donde se nota, genérico gratis para el relleno.

## Arquitectura (3 capas)
1. **BANCO** — frases fijas del guión de Pistero (~930 mp3, `voces-el/`), pregeneradas con
   ElevenLabs pro. Se sirven como **mp3 estático → NO consumen cuota mensual**. Ya hecho.
2. **GENÉRICO** — relleno dinámico (números, calles, nombres, "recalculando", confirmaciones
   de navegación). Va con **voz nativa del navegador (gratis)**. Opcional a futuro: clon
   self-host **Chatterbox (licencia MIT)** para que hasta el relleno suene a Pistero.
   ⚠️ **XTTS-v2 NO** (licencia no comercial, la app se vende).
3. **PREMIUM dinámico** — los pocos momentos de alto impacto que NO están en el banco y
   merecen la voz cara: saludo personalizado, **anuncio de logro desbloqueado**, pre-vuelo,
   cierres emotivos. Estos SÍ gastan cuota → hay que racionarlos.

## Presupuesto con Creator (100k car./mes, ~80 car./frase)
- ~**1.250 frases premium nuevas/mes** ÷ 35 usuarios ≈ **~35 momentos premium por usuario/mes**
  (~1 al día). Con caché rinde más.
- Por eso el premium se reserva para lo que se saborea; el resto, genérico.

## El multiplicador: CACHÉ COMPARTIDO
- Generar cada frase premium-dinámica **una sola vez** y guardarla por texto (Cloudflare R2 /
  Firebase Storage). La 2ª vez que cualquiera pida la misma frase → sale del caché, gratis.
- **Pre-cargar** números 0–100, ciudades/calles comunes de Chile → nacen cacheadas.
- A más usuarios, menos costo por cabeza.

## Tareas de implementación (para la cuenta que lo tome)
1. **Router de voz** en el sistema de voz (`index.html` funcs de voz + `voz-elevenlabs.js`):
   clasificar cada frase → BANCO (mp3) / PREMIUM (ElevenLabs+caché) / GENÉRICO (nativa).
   Aditivo, con `try/catch` y fallback (cero errores colaterales, regla de Inty).
2. **Caché compartido** de premium-dinámico (clave = texto normalizado).
3. **Cuota por usuario/día** de frases premium NUEVAS (~1–2/día con Creator), guardada en
   localStorage + Firestore; pasada la cuota → cae a genérico. Las cacheadas y genéricas no
   cuentan (ilimitadas).
4. **Pre-carga del caché** (números, ciudades) usando la cuota una vez.
5. **NECESITA de la otra cuenta**: la API key de ElevenLabs y `gen-voces-elevenlabs.js` (no
   están en esta máquina) para regenerar/ampliar el banco y generar premium-dinámico.
6. Monitorear el uso real en el panel de ElevenLabs (Subscription) y ajustar los números.

## Honestidad
Números estimados (USD/CLP≈950, frase≈80 car., ~30% de lo dinámico es nuevo). Ajustar con
uso real. Fuentes: precios ElevenLabs 2026 + alternativas open-source (Chatterbox MIT).
