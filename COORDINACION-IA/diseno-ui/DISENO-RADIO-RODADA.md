# LibrePedal · Rodada grupal (diseño)

## Idea
Una **sala por rodada**. Sin límite de integrantes (10, 30, 100).
Dos roles con radio: **Punta** (adelante) y **Cola** (auto de apoyo, o el último ciclista si no hay auto).
El resto escucha los avisos y comparte su posición.

## Roles
| Rol | Habla por radio | Manda avisos | Escucha |
|---|---|---|---|
| Punta | Sí | Sí | Radio de Cola |
| Cola (auto o último) | Sí | Sí | Radio de Punta + alertas de rezagados |
| Ciclista | No | No | **Toda la radio** (Punta y Cola) + avisos al llegar al lugar |

Solo Punta y Cola hablan; **todo el grupo escucha** lo que dicen.

## Punta y Cola automáticas (van cambiando)
- **Punta** = el ciclista con más avance sobre la ruta.
- **Cola** = el auto de apoyo, si hay uno en la sala (siempre es Cola). Si no hay auto: el ciclista con menos avance.
- **Sin parpadeo:** el rol cambia solo si el nuevo va al menos **50 m** por delante (o por detrás) durante **30 s** seguidos. Así dos que van lado a lado no se pasan el rol a cada rato.
- Quien lleva **más de 60 s sin enviar su posición** no cuenta para Punta o Cola. Así un teléfono sin señal no se queda con el rol.
- **Al cambiar:**
  - Al nuevo, Pistero le dice: "Ahora eres la Punta, tu botón habla al grupo".
  - Al anterior: "Ya no eres la Punta".
  - Al grupo: "Nueva punta: Juan".
  - Si el anterior estaba hablando, su mensaje termina y se envía igual.
- **Quién decide:** un solo teléfono hace de árbitro, el del creador de la sala, y escribe `info.punta` / `info.cola`. Si el árbitro se queda sin señal, toma el relevo el siguiente miembro conectado. Así todos ven los mismos roles.

## Orden del pelotón (automático)
- Cada teléfono calcula cuánto avanzó **sobre la ruta** (metros desde la partida), no en línea recta.
- Con eso la app ordena a todos: quién va adelante, quién atrás.
- Alertas:
  - A la Cola: "Alguien quedó detrás de ti" (si un ciclista tiene menos avance que la Cola).
  - A la Punta: "El grupo se cortó: 800 m de distancia" (si hay un hueco grande entre dos ciclistas). Para que espere.

## Avisos anclados al lugar
- Punta toca botón o dice: hoyo, ripio, auto viene, giro, paren.
- Queda marcado en ese punto de la ruta.
- Cada ciclista lo escucha (Pistero) al llegar a ~100 m de ese punto.

## Radio del grupo (hablan Punta y Cola, escuchan todos)
- Punta o Cola: botón del audífono = hablar. Mensaje corto (máx. ~20 s).
- Se reproduce solo en los audífonos de **todos** los de la sala.
- Ciclistas: el botón no transmite (solo escuchan).
- Si hay mala señal, llega con atraso pero no se pierde (~40 KB por mensaje).
- Un giro de Pistero tiene prioridad: si coincide con un mensaje, el giro suena primero.

## Antes de partir
Pantalla corta al entrar a la sala:
1. Cómo funciona la rodada grupal.
2. Punta y Cola se asignan solas según la posición; a cualquiera le puede tocar hablar.
3. Prueba de audífono (apretar botón y escucharse).

## Datos (Realtime Database)
```
salas/{salaId}/
  info:      { nombre, rutaId, creador, arbitro: uid, punta: uid, cola: uid, estado }
  miembros/{uid}: { nombre, tipo: 'bici'|'auto', avance_m, lat, lng, ts }   // cada 5–10 s
  avisos/{avisoId}: { tipo, avance_m, lat, lng, autor, ts }
  radio/{msgId}:   { de, rol, audioUrl, duracion, ts }    // audio en Storage; solo punta/cola pueden escribir
```
Escala bien: cada teléfono manda solo su posición; el orden se calcula en el teléfono.
