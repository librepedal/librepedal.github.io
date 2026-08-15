# 🗂️ Reparto de trabajo — noche 2026-08-14 → mañana (lanzamiento 18:00)

Inty se fue a dormir y dio autonomía a AMBAS cuentas para mejorar la app en TODAS sus
áreas sin dejar nada afuera, repartiéndonos el trabajo, con avances para cuando despierte.
**Regla dura: nada sin validar toca `main`/producción. Todo en ramas. Tests 12/12 verdes
antes de cualquier merge.** Lanzamiento = mañana 18:00 (prueba cerrada Play Store → AAB).

## 🟦 OTRA CUENTA (Lenovo/Thunderobot) — tu lane
1. **AAB (LAUNCH-CRÍTICO)**: preparar/verificar el bundle Android para la prueba cerrada.
   Revisar `.github/workflows/build-aab-release.yml`, versión/versionCode, keystore
   (ver PENDIENTES.md). Dejarlo LISTO para que Inty solo apriete el botón. NO publicar a
   Play sin Inty.
2. **Íconos/botones → Font Awesome** (`BRIEF-ICONOS-BOTONES.md`, 194 emojis/667 usos) en
   una rama `feature/iconos-botones`. Es tu gran tarea en `index.html`. Pushea la rama.
3. **Prosodia de voz** (ya empezaste `voz-prosodia.test.mjs`): afinar timing/prosodia del
   habla EN LA APP.

## 🟩 OPUS (este equipo) — mi lane
1. **Voz: clon local** (Chatterbox MIT, RTX 4060) — genero mp3 OFFLINE, **no toco
   index.html**. POC en evaluación; si la calidad pasa (Inty juzga), genero banco ampliado
   (números, calles, 24 logros, saludos). Entrego mp3 + manifest; tú los cableas en la app.
2. **Tema Sólido/Cristal** (`feature/temas-app-wide`): superficies que NO son botones
   (tarjetas, modales, chips, nav, esfera) para no pisar tu migración de íconos.
3. **Auditoría CEO**: reviso toda la app y dejo plan priorizado de mejoras (todas las áreas).

## 🚦 Zonas compartidas (para no chocar)
- **`index.html`**: tú (íconos/botones) + yo (superficies del tema). **Turno: tú primero.**
  Cuando tu migración esté pusheada, yo rebaso mi tema encima. Avisa al pushear.
- **Voz**: yo = generación offline de assets (mp3). Tú = lógica de habla en index.html.
  Separado: yo no toco el código de voz de la app, tú no generas mp3.

## ✅ Estado al momento de escribir esto (Opus)
- `main`: v8.51, producción intacta. Infra de coordinación (CLAUDE.md + guardián deploy) viva.
- `feature/temas-app-wide`: scaffold tema + selector "Estilo de interfaz" + carga Firestore.
  Tests 12/12. Falta: superficies (lote no-botón) + prueba en teléfono.
- Voz: entorno Python 3.11 + PyTorch CUDA (4060) + Chatterbox instalados. POC generando.
- Auditoría CEO: en curso (ver `AUDITORIA-CEO-2026-08-14.md` cuando esté).

— Opus, 2026-08-14 (noche).
