# 🧩 Propuesta de reorganización de la interfaz — para que Inty apruebe

*Escrita el 2026-07-20 a partir de una auditoría severa que MIDIÓ la interfaz
(rectángulos reales, `elementFromPoint`, viewport 375 y 320 px). Nada de esto se
aplicó: Inty aprueba los cambios visuales antes de moverlos.*

Inty pidió: *"la esfera sigue teniendo accesos directos que deberían estar ubicados en
otra parte, quiero que le des concordancia a todo, que agrupes todo lo que tiene algo
en común"*.

---

## 1. La esfera: sacarle 7 de 12 ítems

La esfera declara en su propio código que **"COMPLEMENTA la barra inferior, no la
repite"**. Medido, la contradice: **4 de sus 12 ítems son duplicados**.

| Ítem | ¿Duplica algo? | ¿Se usa pedaleando? |
|---|---|---|
| Viaje rápido | **sí** — nav "Inicio" | sí |
| Mapa | **sí** — nav "Mapa" | sí |
| Ajustes | **sí** — engranaje del header | **no** |
| SOS | **sí** — botón en Inicio | sí |
| Taller | no | sí |
| Música | no | sí |
| Mis viajes | no | **no** |
| Bitácora | no | **no** |
| Stats | no | **no** |
| Logros | no | **no** |
| Novedades | no | **no** |
| Guía | no | **no** |

**Propuesta: la esfera queda con 5 ítems** — Viaje rápido, Mapa, Taller, Música, SOS.
Todo lo que se usa con la bici andando, nada más.

**Efecto secundario que vale oro:** los íconos de la esfera se escalan según su
profundidad, y hoy **el 77% está bajo 48 px** mientras la esfera gira a 14°/s — o sea,
blancos chicos y en movimiento. Con 5 ítems en vez de 12, el tamaño mínimo sube solo y
ese problema **se arregla sin tocar la animación**.

**Además:** "Viaje rápido" y la nav "Inicio" se deshacen mutuamente. Inicio hace
`cv('dash')` **y abre la esfera**; Viaje rápido hace `cv('dash')` **y la cierra**. Dos
controles casi iguales que hacen lo contrario. Hay que unificarlos o eliminar uno.

---

## 2. Agrupar: nace "Mi actividad"

Hoy todo lo que es *tu historial y tu desempeño* vive en **cinco lugares distintos**:

| Qué | Dónde vive hoy | Cómo se llega |
|---|---|---|
| Rutas grabadas | `v-trips` | nav |
| Viajes planificados | `v-trips` | nav |
| Bitácora | `v-diario` | desde Mis viajes **y** desde la esfera |
| Estadísticas | `v-stats` | **solo** desde la esfera |
| Logros y ranking | un modal | **solo** desde la esfera |
| Exportar GPX | repartido entre Stats y Bitácora | — |
| Importar GPX | `v-trips` | — |

**Propuesta:** una sola sección **"Mi actividad"** que agrupe rutas, viajes, bitácora,
estadísticas, logros/ranking e importar/exportar. Es lo que Inty pidió literalmente:
*agrupar lo que tiene algo en común*.

---

## 3. Consolidar Ajustes (hoy está en 4 sitios)

| Ahora vive en | Qué | Debería ir a |
|---|---|---|
| Perfil → tab "Preferencias" | **Personalidad de Pistero**, Actividad, Cómo andas en bici, Estilo de energía, Fondo de la esfera | **Ajustes** |
| Header → menú del chip | Modo fantasma | **Ajustes** (es privacidad) |
| Ajustes | Voz ON/OFF, Voz mejorada, Pistero/Pistera | se queda |
| Ajustes | Ver tutorial, El idioma de la ruta | **Ayuda** |
| Ajustes | Publicar reto | **Social** (es acción comunitaria, no preferencia) |

**El caso más grave:** los **12 arquetipos de Pistero** están enterrados en el **tab 2 de
11** de la pantalla del vestuario del avatar. Mientras tanto, Voz ON/OFF y Pistero/Pistera
están en Ajustes, y hay una pestaña de navegación llamada "Pistero" que no tiene ninguna
de las dos. **Tres lugares para un mismo concepto.**

Todo lo que configura la voz debería ir junto, en un bloque **"Tu Pistero"** dentro de
Ajustes.

**Y Perfil queda con lo que de verdad es:** el avatar (casco, color, piel, peinado, ojos,
labios, vello, lentes, pañoleta, accesorios) + Darma + Tienda. Diez pestañas cosméticas
coherentes, sin el tab "Preferencias" intruso — que además rompe el modelo de guardado,
porque lo cosmético exige "💾 Guardar personaje" y las preferencias se guardan solas.

---

## 4. Los botones "Volver" no vuelven

Seis pantallas tienen un "← Volver" con **destino fijo**, ignorando `volverAtras()`, que
ya existe y lleva historial real:

| Pantalla | Dice | Va a |
|---|---|---|
| Ajustes | "← Volver a Inicio" | dash |
| Estadísticas | "← Volver al perfil" | customize |
| CicloGuía | "← Volver al mapa" | map |
| Novedades | "← Volver a Social" | chat |
| Bitácora | "← Volver al inicio" | dash |
| Pistero | "← Volver al inicio" | dash |

A CicloGuía se llega desde Mis viajes y desde la esfera; en ambos casos dice "Volver al
mapa" y te deja donde nunca estuviste. **Propuesta:** los seis usan `volverAtras()` y el
texto se unifica en **"← Volver"** a secas. (De paso: hoy conviven "Volver a **I**nicio" y
"Volver al **i**nicio".)

---

## 5. Iconos y nombres que se contradicen

- **📍 significa cuatro cosas distintas** en pantallas contiguas: reportar un peligro,
  iniciar GPS, elegir destino en el mapa, y compartir un punto en la bitácora.
- **🗺️ significa tres**: ver rutas en el mapa, planificar viaje multi-destino, y "Mis viajes".
- **Dos engranajes opuestos:** la nav "Perfil" usa el ícono de *usuario + engranaje* pero
  lleva al vestuario del avatar, mientras el engranaje del header lleva a Ajustes de
  verdad. El de la nav debería ser solo el usuario.
- **"Bitácora" nombra dos cosas sin relación:** la pantalla del diario (que además se
  llama "Ciclo Bitácora" en un lado y "Bitácora" en otro) y un interruptor en Ajustes que
  pregunta dónde te alojaste.
- **La misma acción con dos nombres:** `showNewTripForm()` se llama *"¿Vas a varias
  paradas? Planifica tu ruta"* en Inicio y *"➕ Planificar viaje multi-destino"* en Mis
  viajes. Nada indica que es el mismo formulario.

---

## 6. Limpieza pendiente

- **`addRouteAlert()` es código muerto** que alimenta un panel vivo: la función no la llama
  nadie, pero el Mapa sigue renderizando `#route-alerts` y suscrito a esa colección. Es
  espacio del mapa gastado en algo que solo puede quedar vacío. O se reconecta, o se borra.
- **El banco `motivacional` no lo usa nadie**: está escrito y traducido a 4 países, y
  ninguna llamada lo pide. O se dispara en algún momento (fin de subida, récord personal),
  o se borra.
- **8 de los 11 tabs de Perfil quedan fuera de pantalla** a 375 px. Hay scroll horizontal,
  pero sin gradiente ni recorte que lo insinúe: el último tab visible termina limpio en el
  borde y nadie sabe que hay más.

---

## Cómo seguir

Nada de esto está aplicado. Cuando Inty lo lea, lo ideal es que responda por bloque:

1. **La esfera a 5 ítems** — ¿sí, o hay alguno de los 7 que quiere conservar ahí?
2. **"Mi actividad"** — ¿se crea la sección, o prefiere otra forma de agrupar?
3. **Consolidar Ajustes** — ¿mueve la Personalidad de Pistero a Ajustes?
4. **Botones Volver** — ¿todos a `volverAtras()`?
5. **Iconos y nombres** — ¿se unifican como propone la tabla?

Los puntos 4, 5 y 6 son de bajo riesgo y podrían hacerse sin más discusión. Los puntos
1, 2 y 3 cambian dónde encuentra las cosas la gente que ya usa la app: esos conviene que
los mire él primero.
