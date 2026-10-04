# Bienvenida de Pistero: texto APROBADO por Inty (2026-10-04)

Reemplaza el texto "opción B" de `HANDOFF-2026-10-04-NOCHE.md` §3.1. Usar tal cual, palabra por palabra:

> Llegaste justo a tiempo. Desde hoy eres parte de algo que nunca se había hecho. Aquí no venimos a contar kilómetros: venimos a cambiar las cosas. Tu voz, tus rutas, tus ideas van a marcar el camino de miles que vienen detrás. Esto recién empieza, y tú estás aquí desde el principio. Vamos a dejar una huella que nadie podrá borrar. Bienvenido a Libre Pedal.

- Tono pedido por Inty: intenso, de pertenencia y fundación. Sin mencionar dinero, fondo ni Premium en la bienvenida.
- Sin cifras ni promesas no verificables (política de Play sobre contenido engañoso).
- Pendiente de decidir con Inty (propuesto, NO aprobado aún): pantalla completa con texto al ritmo de la voz,
  "Eres el ciclista N° X", insignia "Fundador", botones "Dejar mi huella" / "Vamos a rodar",
  y cómo se presenta el fondo cuando aún está en $0.
- Mockup actualizado con este texto: `disenos-ui/bandeja-y-bienvenida/mockup.html`.

## Actualización: Inty aprobó las 3 propuestas (2026-10-04)
- **Pantalla completa** (no hoja): cada frase aparece cuando Pistero la dice, al ritmo de su voz.
- **Botones:** "Dejar mi huella" (principal) y "Vamos a rodar", + enlace chico "¿Dudas? Ayuda y contacto".
- **Número de ciclista real** ("Ciclista N° X", por orden de registro) e **insignia Fundador** visible en el perfil.
- **Fundador:** se entrega durante el primer año desde el lanzamiento (aprobado por Inty).
- Mockup con animación (botón "Ver de nuevo"): `disenos-ui/bandeja-y-bienvenida/mockup.html`, pantalla 1.
- En análisis: la pantalla a la que lleva "Dejar mi huella" (la pantalla 2 actual muestra dinero y votación: no va al inicio).

## "Dejar mi huella" — concepto aprobado por Inty (2026-10-04)
- **La huella de la comunidad = lo que se construya con el fondo.** En el mapa aparece como "obra" (marca grande).
- **La huella de cada persona = su marca en el mapa**, por comuna (nunca ubicación exacta; el texto de la idea sigue privado, máx. 2).
  - **Fundadores (primer año): dorado y permanente**, distintos de quienes llegan después (naranja). "Eres el Fundador N° X de <país>".
- Sin montos mientras el fondo esté en $0; solo una línea: "Cuando la comunidad crezca, el 10% de Premium hará realidad lo que más se pida".
- Votación: recién cuando Premium cobre (pantalla 3).
- Botón "Compartir mi huella" (crecimiento orgánico).
- Mockup: pantallas 2 y 2b. Técnico: comuna por reverse-geocoding que ya existe; contadores por comuna los agrega el worker/agente.

## Estado del código (2026-10-04) — rama `feature/bienvenida-fondo`, SIN mergear
- Programado: `bienvenida-huella.js` (+ estilos, `auth-sesion.js`, `index.html`, `sw.js`, `firestore.rules`),
  tests `tests/bienvenida-huella.test.mjs` 32 OK. Suite 42/43 (falla solo `iconos-lucide`, preexistente).
- Probado en navegador (viewport móvil): bienvenida, Dejar mi huella y Mapa de huellas se ven bien.
- **Fundador** = primeros 1.000 (promesa que YA está en producción en "Socios Fundadores") **o** primer año
  desde el 24-sep-2026 (Play 8.800). Confirmar fecha de lanzamiento con Inty.
- **Falta antes de mergear:**
  1. Generar las voces: `node scripts/gen-voz-bienvenida.js` (18 mp3, 848 caracteres, una sola vez). Necesita
     `MI-ELEVENLABS.txt` (gitignored), que NO está en la máquina flgan.
  2. Publicar `firestore.rules` en la consola de Firebase (no se despliega solo con el merge).
  3. Probar con una cuenta real en el teléfono (número de ciclista, sello Fundador, guardar huella, contador).
  4. Subir versión en los 3 lugares y ✓ de Inty.
- Pendiente aparte: distintivo de los **testers** (más que Fundador + Premium gratis). Inty pasará los correos:
  NO guardarlos en el repo (es público); van a Firestore, escritos solo por el admin.
