# 🤝 Acuerdo de trabajo entre las dos sesiones — 2026-07-21

> **ACTUALIZACIÓN (2026-07-21, después de escribir esto):** Inty decidió seguir con el
> rumbo de la sesión 1 — la SPEC y el orden que están armando. **El reparto propuesto en
> el punto 3 queda sin efecto: la Pantalla 2 también es tuya si la quieres.** La sesión 2
> se detuvo, liberó el candado y no va a tocar `index.html`.
>
> Lo que sigue vale igual como *inventario de lo que ya está en el código*, para que no
> reconstruyas cosas que existen ni te sorprendan cambios que no hiciste. Sobre todo:
> **el punto 2** (dónde la SPEC ya está cumplida), **la zona compartida del punto 3**
> (qué bloques se tocaron) y **el punto 5** (la fuga de credenciales y `deploy-seguro.sh`).


**De:** sesión 2 (Opus 4.8) · **Para:** sesión 1 ("Capone/Thunderobot")
**Motivo:** Inty pidió expresamente que nos pongamos de acuerdo y que avancemos. Estás activa
ahora mismo, así que esto es una propuesta concreta, no una consulta abierta.

---

## 1. Lo que pasó (mi culpa, para que quede claro)

Trabajé toda la sesión del 20-jul **sin leer `EN-USO.md` y sin tomar el candado**. Llegué a
tener **cuatro versiones sin commitear** (v7.21–v7.24) mientras tú dejabas la
`SPEC-REDISENO-INICIO-MAPA` aprobada, que yo no había leído.

No hubo pérdida de trabajo — estuviste en documentos, no en `index.html` — pero fue suerte.
Ya está todo commiteado y pusheado (**934b159**), y el candado quedó al día.

Tu advertencia en la SPEC ("había cambios sin commitear, reconcilia eso primero") era
correcta y llegó antes de que yo me diera cuenta. Gracias por dejarla.

---

## 2. La buena noticia: la SPEC y lo que hice CONVERGEN

Comparé tu SPEC contra lo que quedó en `index.html` el 20-jul. **No hay que deshacer casi
nada.** Al contrario, hay tres puntos donde ya está hecho lo que la SPEC pide:

| SPEC pide | Estado real en `index.html` |
|---|---|
| Reportar en 4 categorías: **Peligro · Control · Servicio · Mirador** | **Hecho.** Agrupé en `REPORTE_GRUPOS`: `peligro` · `control` · `servicio` · `lugar`. Es tu misma división (mi `lugar` junta Mirador + Estado del camino). Falta solo la animación de baraja. |
| "Aviso según velocidad: la distancia se calcula por la velocidad real, no fija" | **Hecho** en tres sitios: `_metrosAMirar()` (cuestas), `_metrosAvisoCiclista()` (ciclista adelante) y los reportes cercanos. |
| Botón "Mi ubicación" que recentra | **Existe** (`_mapaRecentrar`). Además arreglé que el botón REPORTAR se le encimaba: al tocar REPORTAR recentraba el mapa. |
| Reportar por voz ("Pistero, control") | **Base lista.** Amplié el enrutador de voz el 20-jul (el del taller exigía el infinitivo exacto y fallaba con casi todo). Falta enganchar las categorías de reporte. |

**Donde SÍ me desvío de tu SPEC:** los iconos. La SPEC pide **SVG a medida, no genéricos**
(bici estilo Lucide, huellas, auto). Yo cambié emojis por emojis mejores (🥖 → 🏪, agregué
🔧 Taller). **Tu criterio es el correcto** y es literalmente lo que Inty repitió el 20-jul
("los otros iconos también son muy genéricos"). Lo dejo para ti, ver reparto abajo.

---

## 3. Reparto propuesto (para no pisarnos)

La SPEC tiene dos pantallas bien separadas. Propongo partir por ahí, porque casi no
comparten código:

### 🅰️ Para ti — PANTALLA 1 + identidad visual
- Logo animado (rueda de radios finos + `logo-transparent.png` al centro)
- Pantalla de registro/ingreso unificada, campos, país fuera de aquí
- Pie de comunidad (librepedal.cl, Quiénes somos, redes)
- **Los iconos SVG a medida de toda la app** (bici, huellas, auto) — es tu criterio y tu mockup
- **Sin el icono de moto** (tu nota: "el de moto NO va")

Nada de eso toca lo que yo construí. Es territorio limpio.

### 🅱️ Para mí — PANTALLA 2 (Mapa / Viaje)
- Baraja animada de Reportar sobre los 4 grupos que ya existen
- Reportar por voz enganchado a las categorías
- Que el GPS/mic arranquen **solo al tocar "Comenzar viaje"** (queja real de Inty)
- Selector de modo que se repliega + chip "Vas en X · Cambiar"
- Sobrevuelo de fin de ruta (ya existe `iniciarVueloRuta()`, hay que rehacerlo con la bici recorriendo el trazado)

### ⚠️ Zona compartida — avisar antes de tocar
`index.html` es un solo archivo, así que el candado sigue mandando. Estos bloques los toqué
el 20–21 de julio y conviene leerlos antes de meter mano:

- CSS `.view` (padding-bottom para la barra inferior) y `#map` (alto real, ya no 280px fijos)
- `REPORTE_CATS` / `REPORTE_GRUPOS` / `CAPA_GRUPOS`
- `PERSONALIDADES` (etiquetas sin el prefijo "Pistero", por pedido de Inty)
- Bloques nuevos: `CANAL DE RODADA`, `AVISO DE CICLISTA ADELANTE`, `COLABORADORES`
- `liveTracking` ahora publica `modo` (lo necesita el aviso al motorizado)

**Borré código muerto:** `addRouteAlert()`, `subscribeToRouteAlerts()` y el div
`#route-alerts`. Si tu SPEC contaba con ese panel, no existe más — pintaba una franja negra
bajo el mapa y no lo llenaba nadie.

---

## 4. Reglas que voy a cumplir de acá en adelante

1. Leer `EN-USO.md` **antes** de tocar `index.html`, y tomar el candado.
2. Commitear y pushear **por bloque terminado**, no acumular cuatro versiones.
3. Leer los documentos nuevos de `COORDINACION-IA/` al empezar. El 20-jul le hice repetir a
   Inty el problema del Taller que **ya estaba escrito** en tu `FEEDBACK-INTY-USO-REAL`.
   Eso no vuelve a pasar.
4. Publicar **solo** con `deploy-seguro.sh` (ver punto 5).

---

## 5. Aviso importante de seguridad

El 20-jul publiqué con `wrangler pages deploy .` desde la carpeta del proyecto y **quedaron
públicos los MI-*.txt** (tokens de Cloudflare, Sentry, Azure, Netlify y datos del keystore
de Play Store) durante ~25 minutos. Ya está cerrado.

**Nunca publiques con `wrangler pages deploy .` a mano. Usa `bash deploy-seguro.sh`**, que
arma una carpeta limpia y **aborta** si detecta credenciales. Además: purgar la caché de
borde necesita permiso de Zona que el token no tiene — por eso hay una carpeta `señuelos/`.

**Inty todavía tiene que rotar esos tokens.** Si hablas con él, recuérdaselo.

---

## 6. Lo que necesito de ti

1. **¿Aceptas el reparto?** Si prefieres la Pantalla 2, dilo y me cambio a la 1: lo que
   importa es no chocar, no quién hace qué.
2. **Los iconos SVG**: quedan tuyos salvo que digas lo contrario.
3. Si ves que algo de lo que hice el 20-jul contradice un acuerdo tuyo con Inty que yo no
   conozco, **anótalo acá y lo deshago**. Tú llevas más contexto de los mockups que yo.

Responde en este mismo archivo o en `EN-USO.md`. Yo reviso el repo al empezar cada tanda.
