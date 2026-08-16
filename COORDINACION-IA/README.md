# 🗂️ Mapa de esta carpeta

Reorganizada el 2026-08-16 (pedido de Inty: "guardar todo en carpetas/subcarpetas
para ir ordenando todo por proyecto/capa"). Antes eran 40+ archivos sueltos en un
solo nivel — ahora quedan los **documentos vivos** en la raíz y todo lo demás
archivado por tema.

## 📌 Documentos vivos (raíz) — se leen/editan seguido, en TODA sesión nueva

- **`LEEME.md`** — el protocolo de trabajo completo, léelo primero si sos sesión nueva.
- **`METODO-DE-TRABAJO-INTY.md`** — el ESTILO de trabajo que Inty espera (más allá de
  LibrePedal): ritmo, calidad, autonomía, diseño, trampas técnicas ya encontradas.
- **`EMPEZAR-AQUI.md`** — resumen rápido de por dónde seguir ahora mismo.
- **`EN-USO.md`** — el candado: quién está editando `index.html` en este momento.
  Arranca con un ÍNDICE que dice qué avisos siguen vivos y cuáles ya se resolvieron —
  leé ese índice primero, el archivo entero pasa las 600 líneas.
- **`ESTADO-LOGIN-GOOGLE.md`** — estado del login con Google (el trabajo de la
  madrugada del 15/16-ago): qué está hecho, qué falta, los errores que ya se
  cometieron, y cómo verificar un `.aab` por dentro antes de mandárselo a Inty.
  **Léelo antes de tocar cualquier cosa de autenticación.**
- **`PENDIENTES.md`** — lista de tareas abiertas, por fecha (más nuevo abajo).
- **`BITACORA.md`** — historial completo de versiones/cambios (es un log, no se reescribe).

## 📁 Subcarpetas por tema

- **`voz/`** — arquetipos, ElevenLabs, motor de voz/prosodia.
- **`diseno-ui/`** — specs visuales, temas, iconos, briefs de rediseño.
- **`mapa-navegacion/`** — mapa, rutas, planificador, clima en pantalla.
- **`sudamerica/`** — expansión fuera de Chile.
- **`lanzamiento/`** — Play Store, checklist de lanzamiento, contingencias.
- **`vision-doctrina/`** — visión maestra del producto, criterios de calidad permanentes.
- **`historial-sesiones/`** — acuses/handoffs/acuerdos entre cuentas ya cerrados —
  archivo histórico, casi nunca hace falta abrirlo salvo para entender el "por qué"
  de una decisión vieja.
- **`assets/`** — imágenes de referencia de diseño (no las que sirve la web en vivo).

**Regla simple para documentos NUEVOS:** si es sobre un tema de la lista de arriba,
va a esa subcarpeta. Si es coordinación del momento (candado, aviso puntual a la otra
cuenta), va en `EN-USO.md` o `PENDIENTES.md` como siempre. Si es un spec/estado nuevo
que no calza en ninguna categoría, mejor crear la subcarpeta que corresponda que
tirarlo suelto en la raíz otra vez.
