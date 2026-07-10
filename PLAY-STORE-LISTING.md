# Ficha de Play Store — Libre Pedal

Todo listo para copiar y pegar en Play Console cuando esté creada la cuenta de desarrollador (único paso pagado, USD 25 una vez, lo haces tú).

---

## 1. Datos básicos

**Nombre de la app** (máx. 30 caracteres):
```
Libre Pedal
```

**Descripción breve** (máx. 80 caracteres):
```
Tu copiloto ciclista: navegación por voz, comunidad y seguridad en ruta
```
(72 caracteres)

**Categoría sugerida:** Mapas y navegación
**Categoría secundaria (si permite):** Salud y bienestar / Deportes

**Etiquetas / palabras clave** (para búsqueda, no siempre hay campo directo pero sirven para la descripción):
ciclismo, bicicleta, navegación bici, ruta ciclista, Waze bicicleta, Chile, comunidad ciclista, GPS bici, Strava, ciclovía

---

## 2. Descripción completa (máx. 4000 caracteres)

```
Libre Pedal es tu copiloto en cada pedaleo. Te guía por voz como Waze, pero pensado para bicicleta, y te conecta con una comunidad real de ciclistas que reportan agua, talleres, miradores y peligros en el camino.

🗣️ NAVEGACIÓN POR VOZ CON PISTERO
Pistero, tu copiloto, calcula la ruta en bicicleta y te avisa cada giro con voz natural, sin que tengas que mirar el teléfono. Escribe o dicta tu destino y arranca. Puedes planificar viajes con varias paradas.

🌎 MAPA VIVO DE LA COMUNIDAD
Más de 4.000 puntos reales en todo Chile —agua, talleres de bicicletas y miradores— además de lo que va sumando la comunidad. Reporta peligros en el camino (baches, animales sueltos, cortes) para avisar a otros ciclistas, y marca un punto directo en el mapa aunque no tenga dirección.

🛡️ SEGURIDAD EN RUTA
- Detección de caídas: si hay un impacto fuerte seguido de inmovilidad, la app te pregunta si estás bien y puede avisar.
- Seguimiento en vivo: comparte un link temporal para que alguien te siga en tiempo real mientras andas.
- Botón SOS para avisar a tus contactos de emergencia.
- Reporta el tipo de superficie y dificultad de cada camino.

🏆 PROGRESO Y COMUNIDAD
- Estadísticas completas: kilómetros, calorías, velocidad media y máxima.
- Exporta tus rutas en formato GPX para usarlas en Strava, Komoot u otras apps.
- Segmentos con tabla de líderes y tus mejores tiempos personales.
- Retos y temporadas que premian con puntos Darma.
- Resumen anual estilo "wrapped" de todo lo que pedaleaste en el año.
- Conecta tu pulsómetro o potenciómetro por Bluetooth.
- Personaliza tu propio personaje: más de 18 cascos, colores y accesorios. Cada ciclista se ve en el mapa con su propio casco, no con un pin genérico.

🔧 TALLER MACGYVER
17 trucos para reparar tu bicicleta con lo que tengas a mano si se te pincha o se te sale la cadena en medio de la ruta. Puedes sumar tus propios trucos para la comunidad.

🔒 NUESTRO COMPROMISO
Libre Pedal se construye con datos reales, sin usuarios falsos ni cifras infladas. Tu ubicación en el mapa comunitario se comparte aproximada, nunca exacta, y puedes activar el modo fantasma cuando quieras no aparecer. Lo esencial de la app —navegación, mapa, comunidad, seguridad y estadísticas— es y seguirá siendo gratis.

Hecha en Chile, pensada para toda Latinoamérica. Sal a rodar con Pistero.
```
(carácteres aprox. 2050 / 4000 — hay espacio para agregar más si se quiere)

---

## 3. Assets gráficos (ya generados en esta carpeta)

| Archivo | Uso | Estado |
|---|---|---|
| `play-icon-512.png` | Ícono de la app (512×512) | ✅ Listo |
| `play-feature-graphic-1024x500.png` | Gráfico de portada (1024×500) | ✅ Listo |
| Capturas de pantalla (mín. 2, ideal 4-8) | Galería de la ficha | ⏳ Pendiente — se toman de la app real (ver nota abajo) |

**Nota sobre capturas:** las capturas de pantalla se deben tomar de la app corriendo de verdad (login, mapa, navegación, perfil). Cuando quieras, las genero abriendo la app en el navegador y capturando pantalla a pantalla — solo dime cuándo lo hacemos, o lo dejo para la próxima sesión.

---

## 4. Política de privacidad (obligatoria)

URL a usar en Play Console una vez el dominio esté conectado:
```
https://librepedal.cl/privacidad.html
```
Mientras tanto, sirve igual la de Cloudflare Pages:
```
https://librepedal.pages.dev/privacidad.html
```

---

## 5. Cuestionario de clasificación de contenido (guía de respuestas)

Play Console hace un cuestionario tipo IARC. Respuestas sugeridas según lo que hace realmente la app:

- **Violencia:** No.
- **Contenido sexual:** No.
- **Lenguaje ofensivo:** No (pero hay chat entre usuarios sin filtro automático — declarar "contenido generado por usuarios, moderado manualmente").
- **Sustancias controladas:** No.
- **Juego / apuestas:** No.
- **Comparte ubicación con otros usuarios:** Sí (mapa comunitario, aproximada; hay modo fantasma para desactivarlo).
- **Contenido generado por usuarios:** Sí (comentarios, recomendaciones, reportes, chat, fotos de POI).
- **Permite comunicación entre usuarios:** Sí (chat global, mensajes directos).
- **Compras dentro de la app:** No, por ahora.

Resultado esperado: clasificación **PEGI 3 / Para todos**, con advisory de "interacción entre usuarios" y "comparte ubicación".

---

## 6. Sección "Seguridad de los datos" (Data Safety)

Basado en `privacidad.html`. Declarar:

**Datos que se recopilan:**
- Ubicación (aproximada, para el mapa comunitario; precisa, solo localmente para navegación) — *compartida con otros usuarios de forma aproximada, no vendida a terceros*.
- Información personal: nombre, correo electrónico.
- Contenido generado por el usuario: mensajes, fotos, comentarios.
- Datos de actividad física: rutas, distancia, calorías (estimadas).
- Identificadores del dispositivo: mínimos, solo lo necesario para la sesión.

**Prácticas a declarar:**
- Los datos se transmiten cifrados (HTTPS). ✅
- El usuario puede pedir borrado de sus datos. ✅ (ver punto 7 de `privacidad.html`)
- No se venden datos a terceros. ✅
- No hay anuncios ni seguimiento publicitario de terceros. ✅

**Terceros con los que se comparte información (infraestructura, no publicidad):**
Google Firebase (autenticación y base de datos), Cloudflare (hosting), OpenStreetMap/OSRM (mapas y rutas), Open-Meteo (clima).

---

## 7. Contacto público

Pendiente definir un correo del dominio (ej. `contacto@librepedal.cl`) una vez que conectemos el dominio a Cloudflare y activemos el enrutamiento de correo (Cloudflare Email Routing, gratis — lo dejo configurado apenas cambies los nameservers).
Mientras tanto se puede usar el correo personal para el registro de la cuenta de desarrollador.

---

## 8. Cuenta de desarrollador de Google Play

- Costo: **USD 25, pago único** (no es suscripción). Con esa misma cuenta se pueden publicar apps ilimitadas.
- Este paso lo debes hacer tú directamente en https://play.google.com/console — yo no puedo pagarlo ni crear la cuenta por ti.
- Una vez creada, me avisas y subo/preparo el resto (build firmado, ficha completa, capturas).
