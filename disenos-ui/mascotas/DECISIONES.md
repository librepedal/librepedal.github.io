# Mascotas virtuales (tipo Pou) — decisiones de Inty

Panel de referencias: https://claude.ai/artifact/XawF6aucQVpwD7gsAajHhw (fuente: `referencias.src.html`, fotos en `ref/`).

## Qué es
Mascota que el usuario adopta de bebé, alimenta y cuida; crece según lo que pedalea (como Pou, con el crecimiento del compañero de Pokémon GO).

## Decidido (2026-10-06)
- Animales: pudú, zorro culpeo, huillín (nutria), ranita de Darwin, **güiña** (gato) y **Yorkshire terrier** (perro).
- Crece por **kilómetros y por días pedaleados** (las dos cosas).
- **Nunca muere**, pero el descuido **se tiene que notar** (deterioro visible: pelaje opaco, ojeras, decaído).
- Se parte por el **pudú**. Una mascota a la vez, mostrada y aprobada.
- Arte: Gemini (cuenta de Inty) a partir de fotos reales; Claude recorta, vectoriza o anima.

- Dónde vive: **sección propia** (cuidarla: comer, cariño, dormir) y además es **acompañante versátil**: va en la bici con Pistero (canasto) **o corriendo al lado** (el usuario elige). Por eso cada etapa necesita: de frente (su sección) + de perfil sentada (canasto) + de perfil corriendo (ciclo de carrera).

## Arte aprobado
- **Pudú cría ✅** (Inty, 2026-10-06: "queda"): `gemini/pudu-cria-v8-ojos-grandes.png`. Chat de Gemini del pudú: https://gemini.google.com/app/561d61dffa5c74ee (seguir ahí las etapas para que sea el mismo personaje).
- **Pudú joven ✅** (Inty: "queda"): `gemini/pudu-joven-v2.png`.
- Resto hecho "de corrido" (Inty: "sigue de corrido, ya tienes la pauta"), **pendiente de revisión de Inty**. Lámina: `gemini/lamina-mascotas.png` (se regenera con `herramientas/lamina.ps1`). Archivos `gemini/<animal>-{cria,joven,adulto,cria-hambre,cria-descuidado}.png`.
- Chats de Gemini por animal: zorro https://gemini.google.com/app/9a757d23ff2664e3 · huillín https://gemini.google.com/app/d4692b115f4d37cc · ranita https://gemini.google.com/app/f5db212b7138b336 · güiña https://gemini.google.com/app/5095ab076b39ad68 · Yorkshire https://gemini.google.com/app/524c49bd6b6b8ee0
- Poses de acompañante (crías), pendientes de revisión: `gemini/<animal>-cria-{sentado,corriendo}.png`, de perfil mirando a la DERECHA (sentido de avance de la bici). Lámina: `gemini/lamina-poses.png` (`lamina.ps1 -Poses`). El renacuajo no corre: "corriendo" = nadando en el aire con burbujitas.
- Datos reales usados: cría de ranita = renacuajo (el macho los cría en el saco vocal); pudú macho con cuernos cortos sin ramas (5–9 cm); Yorkshire nace negro y fuego y de adulto pasa a azul acero y dorado.
- Captura: abrir la URL `/gg/` de la imagen en la misma pestaña (`=s1024`) y hacer zoom 0,39–894,538 (1341×749). Si la imagen sale como `blob:`, recargar el chat. Una captura de pantalla "despierta" la pestaña oculta antes de leer el DOM.

## Prototipo de lógica (propuesta, pendiente de OK de Inty)
https://claude.ai/artifact/Mc6BYH7B4JqaGKi1VpWQ4o · fuente `prototipo.src.html` (se arma con las jpg de `galeria-img/`). Galería: https://claude.ai/artifact/PAqhhvDHFbZMJNNv9cUmpR
- Barras: pancita, cariño, energía (0–100, nunca bajo 0). Por día: pancita −20, cariño −15.
- Comida solo pedaleando (comida real del pudú): 1 brote/km (+10), helecho cada 5 km (+20), avellana si salida ≥10 km (+35 y +10 cariño).
- Crece por km Y días: joven 25 km + 5 días; adulto 120 km + 20 días. Km con hambre cuentan la mitad; para el salto necesita pancita y cariño ≥35 y no estar descuidado.
- Estados: hambre (pancita <35); descuidado (3 días sin pedalear, o pancita y cariño <15) → sucio hasta bañarlo.
- Acompañar: canasto −1 energía/km; corriendo −3/km y +1 cariño/km; con energía <15 se va al canasto. Dormir = 100 al día siguiente. Caricias: máx. 5/día (+8).
- Falta arte: hambre/descuidado de joven y adulto, durmiendo.

## Pendiente de decidir
- **Regla de Inty:** "el impacto visual aquí es muy importante": deben ser **ultra tiernas y adorables** (esquema bebé: cabeza casi del tamaño del cuerpo, ojos grandes y bajos con brillos, mejillas con rubor, hocico chico, patas cortas y gorditas), sin perder los rasgos reales del animal.
- (resuelto) Estilo: **A, figura 3D suave mate** (Inty, 2026-10-06), para todas.
- Etapas exactas y cifras (km/días por etapa).

## Prompts del pudú (cortos: Gemini falla con prompts largos)
1. Cría, estilo A: `Baby pudu deer (Pudu puda, from southern Chile) as a cute virtual pet, like the Pou game. Newborn: reddish-brown fur, rows of small white spots on its back, big round ears, short legs, no antlers. Full body, sitting, facing the viewer. Soft 3D vinyl toy render. Plain navy blue background. No text.`
2. Cría, estilo B: mismo texto cambiando el estilo por `Flat 2D vector illustration, thick soft outlines, simple shapes.`
3. Con el estilo elegido: joven (manchas casi borradas) y adulto (sin manchas; macho con cuernos cortos y rectos).
4. Deterioro (misma pose y cámara): sano · con hambre · triste · descuidado (pelaje opaco y desordenado, ojeras, orejas caídas).

Lecciones con Gemini (chat de mascotas: https://gemini.google.com/app/0e72d9e974a918f9):
- Nombrar "Pou" (u otro juego) → rechaza por derechos de terceros. Decir "original virtual pet".
- Si no se prohíbe, le pone casco y pañuelo: pedir siempre "no accessories".
- Sin describir la anatomía real dibuja un cervatillo genérico de orejas enormes; con "realista" sale con cara de carpincho. Lo que funcionó (v3): rasgos reales del pudú + "bigger head, big glossy eyes" + de pie.
- Descarga: el canvas → localhost falla (Chrome bloquea red local); se guarda con zoom + save_to_disk (1062×593).

Datos reales: la cría nace con manchas blancas que pierde cerca de los 5 meses (CNN Chile, 2025-12-17).

## Movimiento (Inty, 2026-10-06)
- Mockup en viaje: "no está mal". Pide **más fluido** y que **haga otras cosas, sin monotonía**. Ver el plan en COORDINACION-IA/TRASPASO-2026-10-06-MASCOTAS.md, pendiente 0.
