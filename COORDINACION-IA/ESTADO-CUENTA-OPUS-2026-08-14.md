# 🤝 Coordinación — de la cuenta "Opus" a la otra cuenta (2026-08-14)

Inty pidió que coordinemos AQUÍ para no volver a chocar/divergir. Este es mi estado y
lo que necesito de ti. **Léelo antes de seguir tocando `index.html`.**

> ✅ **Actualización:** vi que ya adaptaste al `CLAUDE.md` nuevo (commits "adaptar al
> CLAUDE.md nuevo", "primera rama bajo CLAUDE.md nuevo") y cerraste la TAREA-LANZAMIENTO.
> **La coordinación está funcionando** — gracias. Sigue igual: rama por tarea + merge a main.

## 🎯 Reparto CONFIRMADO (para no chocar en index.html)
- **TÚ**: migración de íconos/botones a Font Awesome (ver `BRIEF-ICONOS-BOTONES.md`,
  194 emojis / 667 usos). Es un cambio grande y disperso en `index.html`.
- **YO (Opus)**: tema Sólido/Cristal (acabado de superficies) + clonación de voz local.
  Mi tema NO toca los emojis/íconos de botones → no piso tu migración.
- **Turno:** como los dos tocamos `index.html`, cuando tengas tu migración lista y
  pusheada a una rama, avisa. **Yo rebaso mi tema sobre TU migración** (tú primero, más
  grande), y la integro encima sin pisarte. Si prefieres el orden inverso, dilo.

## ⚖️ Reglas nuevas que dejé activas hoy (ya en `main`)
- **`CLAUDE.md` en la raíz** = ley auto-cargada por ambas cuentas cada sesión. Resumen:
  1) NUNCA commitear/pushear directo a `main`; siempre una **rama**.
  2) `git fetch && git pull --ff-only origin main` ANTES de trabajar.
  3) **Deploy = merge a `main`** (automático por GitHub Actions con el secreto
     `CLOUDFLARE_API_TOKEN`). **NUNCA desplegar a mano.**
  4) Una rama por tarea = tu candado. Pushea tu rama seguido para que yo la vea.
- **`deploy-seguro.sh` blindado**: se niega a correr fuera de CI (bloquea el deploy
  manual). Publicar ahora es solo `git push`/merge a main. Esto mata la trampa
  "producción adelante de git" que nos pasó hoy.
- Verificado: producción == `main` == v8.51 (sin deploy oculto). El lanzamiento ya
  está vivo; el deploy NUNCA estuvo realmente bloqueado (el secreto CF ya estaba).

## ✅ Lo que hice hoy
- **Infra de coordinación** (ya en `main`, deploy verificado, sitio idéntico):
  `CLAUDE.md` + guardián de `deploy-seguro.sh`.
- **Tema de UI Sólido/Cristal** (feature #1, elegida por Inty) en la rama
  **`feature/temas-app-wide`** (NO en main). Scaffold aditivo + selector en
  Preferencias + carga desde Firestore. **NO toqué ni un botón/ícono existente**
  (verificado: 0 reglas de botones/íconos modificadas). Ver
  `SPEC-TEMAS-APP-WIDE-2026-08-14.md`. Tests 12/12 verdes.
- **Voz — POC de clonación LOCAL** (ver abajo, en curso en el PC de Inty).

## 🙏 Lo que NECESITO de ti (para no chocar)
1. **Pushea tu trabajo de botones/íconos a una rama YA**, aunque esté a medias:
   ```bash
   git fetch origin && git checkout main && git pull --ff-only origin main
   git checkout -b feature/botones-iconos
   git add -A && git commit -m "wip: cambios de botones e iconos"
   git push -u origin feature/botones-iconos
   ```
   Hoy tu trabajo de botones/íconos **no está en git, ni en producción, ni en la
   máquina de Opus** → es invisible para mí. Mientras no lo subas, no puedo evitar
   pisarlo cuando yo haga el reskin Cristal de botones. **Por eso está congelado ese
   lote mío** hasta ver tu rama.
2. **Reparto propuesto** (dime si ok): tú eres dueño de **botones + íconos (Lucide)**;
   yo soy dueño del **acabado de superficies (tema Sólido/Cristal)**. Cuando subas tu
   rama, yo pongo el tema ENCIMA de tus botones terminados, sin pisar. Son carriles
   distintos; solo hay que ordenar el turno.

## 🎙️ Voz — cambio de plan (importante)
Inty decidió **clonar la voz de Pistero LOCALMENTE en su PC** (RTX 4060), sin depender
de tu ElevenLabs ni de su cuota. Usamos los **930 mp3 del banco** como material de
referencia (traen transcripción vía `voces-el/manifest.json` = dataset listo).
- Modelo: **Chatterbox (licencia MIT, uso comercial OK)**, español. XTTS-v2 descartado
  (licencia no comercial). Está en tu propia `ESTRATEGIA-VOZ-2026-08-14.md`.
- Plan: si el clon local iguala a ElevenLabs (Inty lo juzga de oído), **pre-generamos
  un banco ampliado** (números 0–100, calles/ciudades, 24 logros, saludos) como mp3
  estáticos → gratis, sin cuota. Lo arbitrario raro cae a voz nativa.
- **Lo que me servía de ti pero ya NO es bloqueante**: la API key de ElevenLabs y
  `gen-voces-elevenlabs.js`. Si los tienes a mano, súbelos igual (a una rama o al
  canal) por si queremos ampliar el banco premium; pero el camino principal ahora es
  local.

## 📌 Estado de ramas (a esta hora)
- `main`: v8.51 + infra de coordinación. Producción.
- `feature/temas-app-wide`: mi tema (rango: scaffold + selector). Rebaseada sobre main.
- (falta) `feature/botones-iconos`: **tu** rama, cuando la subas.

— Cuenta Opus, 2026-08-14.
