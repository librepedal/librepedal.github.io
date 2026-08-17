# Tarea piloto para Capone — 3 pañoletas de prueba

Pedido de Inty (2026-08-17): antes de repartir todo el catálogo grande de pañoletas/
máscaras, probar con una tarea CHICA en la otra cuenta/instancia ("Capone") y comparar
resultados. Esta es esa tarea — self-contenida, no requiere leer el resto del historial.

## Contexto mínimo necesario
- Personaje: Pistero (mascota de LibrePedal, app de ciclismo).
- Método YA validado, no reinventar: **inpainting enmascarado** sobre una imagen base fija.
  Detalle completo, con los nodos exactos de ComfyUI, en
  `COORDINACION-IA/diseno-ui/BIBLIA-PISTERO-2026-08-15.md` (secciones 2, 3-bis, 3-ter,
  3-quater — MUY importante leer estas antes de armar la máscara, ya se documentaron
  varios fracasos reales ahí).
- Base fija a usar: `disenos-ui/pistero-3d/aprobadas/base-neutral.png`.
- Infra ComfyUI: **NO tocar la instancia principal en :8188**. Instrucciones para levantar
  una instancia separada en el punto 0 de la Biblia. Antes de generar, avisar en
  `COORDINACION-IA/EN-USO.md` qué puerto se está usando (GPU de 8GB, no correr dos
  generaciones pesadas a la vez).

## Zona nueva: esta es la PRIMERA vez que se toca el cuello/pañoleta
No hay máscara de referencia previa para esta región (todo lo hecho hasta ahora es casco,
cara, ojos). Hay que definir la máscara de cero: aprox. la zona del cuello/clavícula bajo
el mentón, sin invadir el mentón/boca (eso ya es región de otra capa). Partir con margen
generoso (ver lección 3-bis de la Biblia: la fuga en espacio latente es más grande que el
mask visible — no ajustar fino a la primera).

## Las 3 piezas del piloto (elegidas para cubrir familias bien distintas, no variaciones del mismo patrón)
1. **Pañoleta negra sólida clásica** — anudada tipo bandana de ciclista, tela lisa mate.
2. **Pañoleta paisley clásico rojo/negro** — el estampado bandana tradicional (paisley),
   NO un ícono plano — usar vocabulario de tela real: "printed cotton bandana fabric,
   fabric folds and wrinkles, soft matte texture" (ver lección 4-ter de la Biblia sobre
   "sticker vs molded" — mismo principio aplica acá: pedir textura de TELA real, no un
   parche plano).
3. **Pañoleta camuflaje bosque** — patrón camuflaje verde/marrón clásico, misma textura de
   tela que las anteriores.

## Verificación antes de entregar (obligatorio, no aprobar a ojo)
1. Diff de píxeles fuera de la máscara: debe dar ~0-5 (ver método en la Biblia, sección 2,
   punto 5).
2. Verificación visual de que las 3 piezas se ven CLARAMENTE distintas entre sí (no basta
   con diff=0 fuera de máscara — eso solo prueba que no se rompió nada afuera, no que el
   contenido de adentro esté bien diferenciado, ver lección 3-quinquies).

## Entrega
- Guardar en `disenos-ui/pistero-3d/aprobadas/panoleta-{negra,paisley,camuflaje}.png`.
- Commitear en rama propia (ej. `assets/panoletas-piloto-capone`), pushear, avisar en
  `EN-USO.md` que está listo.
- NO seguir con el resto del catálogo de pañoletas/máscaras todavía — esto es SOLO el
  piloto de 3, para comparar método/calidad antes de decidir cómo repartir el resto
  (~17 piezas más quedan pendientes, ver conversación con Inty del 2026-08-17).
