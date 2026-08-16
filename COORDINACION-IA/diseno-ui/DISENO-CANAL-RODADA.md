# 📻 Canal de Rodada — comunicación en grupo y con el escolta

*Diseño del 2026-07-20. Nace de descartar el walkie-talkie ciclista↔automovilista
(ver más abajo por qué) y quedarnos con lo que Inty acotó: **grupo organizado y escolta
oficial**.*

---

## Por qué NO el walkie-talkie con los autos

Se investigó cómo lo hicieron otros. **Ya se intentó varias veces y los ciclistas lo
rechazaron**, con razones sólidas:

1. Solo sirve si el auto también la instaló — y no la va a instalar.
2. Traslada la culpa al ciclista ("si no usabas la app, es tu problema"): el mismo
   argumento del casco usado para culpar a la víctima.
3. Pone al conductor mirando la pantalla, que es lo contrario de la seguridad.
4. Diagnostica mal: el problema no es falta de comunicación, es manejo negligente.

Lo que sí funciona no es una app para el conductor: es infraestructura (SiBike habla con
los semáforos) o el auto de fábrica (GM detecta ciclistas en el punto ciego). Nada de eso
está a nuestro alcance ni hace falta.

**Entre ciclistas del mismo grupo el problema desaparece:** todos tienen la app puesta,
todos aceptaron estar ahí, y nadie le traslada la culpa a nadie.

---

## El problema real del ciclista (que Zello no resuelve)

Zello es el líder en push-to-talk: 150 millones de usuarios, canales, funciona por datos
móviles sin límite de distancia. Los motociclistas lo usan con un botón en el manillar.

**Pero el ciclista no es motociclista:**

| | Motociclista | Ciclista |
|---|---|---|
| Botón en el manillar | sí (Sena/Cardo) | no |
| Manos libres | una, sin esfuerzo | ninguna, y con esfuerzo |
| Batería | la moto carga el teléfono | la del teléfono, y tiene que durar el viaje |
| Señal | rutas con cobertura | cuestas y quebradas sin nada |

Zello además **gasta mucha batería** (reportado por sus propios usuarios) y necesita datos
constantes. Copiarlo tal cual sería copiarle los problemas.

---

## La solución: el canal pasa por Pistero

**La idea central: viaja TEXTO, la voz se sintetiza en cada teléfono.**

En vez de transmitir audio (caro, pesado, muere sin señal), el ciclista le habla a Pistero
—que ya escucha comandos de voz— y Pistero le dice al grupo. En el teléfono del que
recibe, es **su propio Pistero, con su propio arquetipo**, el que lo cuenta.

```
Ciclista A: "Pistero, avisa hoyo"
        ↓  (viaja un texto de 20 bytes)
Ciclista B oye, en la voz de SU Pistero: "Ojo, hoyo adelante. Aviso del Manuel."
```

**Por qué esto le gana a un walkie-talkie de verdad:**

- **Casi no gasta datos.** Un aviso pesa lo que un mensaje de texto, no lo que un audio.
  Funciona con la señal mala de una cuesta.
- **Casi no gasta batería.** No hay micrófono abierto ni streaming permanente.
- **No hay que tocar el teléfono.** Ya existe el comando de voz; esto lo reutiliza.
- **Se entiende siempre.** No hay ruido de viento, ni alguien que habla pegado al micrófono,
  ni el que se olvidó de soltar el botón. El texto llega limpio y lo lee una voz clara.
- **Se puede guardar.** Los avisos quedan en la bitácora de la rodada. El audio no.
- **Es coherente con la app.** No aparece una función pegada con alambre: es Pistero
  haciendo lo que ya hace, ahora también para el grupo.

### Los avisos de un toque

Para lo urgente, ni siquiera hay que hablar. Un set corto y fijo, pensado desde lo que
de verdad se grita en una rodada:

| Aviso | Cuándo |
|---|---|
| 🕳️ **Hoyo** | el clásico, el que va adelante avisa al de atrás |
| 🚗 **Auto atrás** | el de atrás avisa al de adelante |
| 🛑 **Frenando** | evita el efecto acordeón |
| ✋ **Me quedé** | pinchazo, calambre, o simplemente no doy más |
| 🔧 **Pinchazo** | para que el escolta sepa que tiene que parar |
| 💧 **Paramos** | agua, baño, foto |

Son seis. **No más**, porque una lista larga obliga a mirar la pantalla y eso es
exactamente lo que estamos evitando.

### El escolta es distinto y hay que tratarlo distinto

El auto de apoyo tiene **pantalla, manos libres y enchufe**. No tiene sentido darle la
misma interfaz mínima que al que va pedaleando:

- Ve a todos sus ciclistas en el mapa (esto ya existe: modo "Auto de apoyo" + `liveTracking`)
- Puede escribir o hablar libremente al canal
- Recibe destacado el ✋ "me quedé" y el 🔧 "pinchazo", que son literalmente su trabajo
- Puede avisar al grupo cosas que solo él sabe: "agua lista en el km 40", "vamos 20 minutos tarde"

---

## Sobre qué se construye (ya existe, no hay que inventarlo)

- `rodadas` — la colección de salidas grupales **ya está en Firestore**
- `liveTracking` — las posiciones en vivo **ya están**
- `handleVoiceCommand()` — el reconocimiento de voz **ya está**
- `h()` + los arquetipos — la voz de Pistero **ya está**

Falta la colección `rodadaAvisos` (o un subdocumento de `rodadas`) y el enganche.

---

## Por fases

**Fase 1 — los seis avisos de un toque.** Sin voz todavía. Se prueba lo esencial: que
llegue rápido, que suene en la voz correcta y que no moleste. Es la fase que se puede
construir y probar sin costo de infraestructura.

**Fase 2 — dictado a Pistero.** "Pistero, avisa que paramos en la bomba". Reutiliza el
comando de voz existente; el texto libre viaja igual que los avisos fijos.

**Fase 3 — el escolta.** Panel para el auto de apoyo: lista de ciclistas, quién se quedó
atrás, y poder hablarle al grupo.

**Fase 4 (solo si de verdad hace falta) — audio real.** Recién acá aparece WebRTC y su
costo. La apuesta de este diseño es que **no va a hacer falta**, porque el 95% de lo que
se grita en una rodada son esos seis avisos.

---

## Lo que hay que cuidar

- **Que no se convierta en un chat.** Si la gente empieza a conversar, el canal deja de
  servir para lo urgente. Los avisos son cortos y con un tope por minuto por persona.
- **Silencio por defecto en carrera.** En modo Rutero el canal debería avisar solo lo de
  seguridad (hoyo, auto atrás, frenando) y callar el resto.
- **Quién puede entrar.** Solo los inscritos en esa rodada. Un canal abierto a
  desconocidos trae de vuelta todos los problemas del walkie-talkie con los autos.
- **Que se pueda apagar.** Un botón, siempre visible, para dejar de oír al grupo.

---

## Fuentes

- [road.cc — por qué los ciclistas rechazaron estas apps](https://road.cc/content/news/256042-another-app-launched-warn-drivers-presence-cyclists-gets-another-backlash-bike)
- [Zello — push-to-talk, canales, alcance sin límite por datos](https://zello.com/)
- [IASUS — push-to-talk en rodadas grupales](https://iasus-concepts.com/push-to-talk-for-group-riders-a-smarter-way-to-communicate-on-the-road/)
- [Yunex SiBike — la bici habla con el semáforo, no con el auto](https://www.westernsystems-inc.com/bicycle-detection-siemens-sibike/)
- [GM Side Bicyclist Alert — detección desde el vehículo](https://news.gm.com/home.detail.html/Pages/topic/us/en/2024/oct/1017-bike.html)
