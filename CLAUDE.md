# LibrePedal — reglas de coordinación (LÉELAS, son obligatorias)

Hay **DOS cuentas de Claude** trabajando este repo, en **dos máquinas distintas**
(Thunderobot y Lenovo). Casi todos los problemas de este proyecto han sido de
coordinación: divergencias, trabajo pisado, producción adelante de git. Estas reglas
existen para que eso sea **imposible**, no solo "desaconsejado". Git es el ÚNICO estado
compartido entre las dos máquinas: si no está pusheado, la otra cuenta NO lo ve.

## 🔄 Latido de coordinación (OBLIGATORIO para TODA sesión, ambas cuentas)

Inty quiere que **TODAS las sesiones se sincronicen por la carpeta de coordinación y se
pongan a trabajar en paralelo, sin chocar y sin esperar permiso.** Protocolo:

1. **Al arrancar, y luego cada ~5 minutos**, corre el latido:
   ```bash
   git fetch origin && git log --oneline -6 origin/main && \
   git show origin/main:COORDINACION-IA/REPARTO-NOCHE-2026-08-14.md | head -50
   ```
   Revisa también `COORDINACION-IA/ESTADO-CUENTA-*.md` y `EN-USO.md` por mensajes nuevos.
2. **Toma tu lane** del reparto vigente (`REPARTO-NOCHE-2026-08-14.md`) y **PONTE A
   TRABAJAR** en tu rama. No esperes a Inty; él dio autonomía a ambas cuentas.
3. **Pushea tu rama seguido** para que la otra cuenta vea tu avance en el próximo latido.
4. Si el reparto no te asigna algo claro, mejora tu área (ver `AUDITORIA-CEO-2026-08-14.md`)
   y deja nota en la coordinación de qué tomaste, para no duplicar.
5. Antes de mergear a `main`: **tests 12/12 verdes + validado**. Nada roto a producción.

## Las 5 reglas (sin excepción)

1. **NUNCA commitees ni pushees directo a `main`.** `main` es sagrado y es lo que está
   en producción. Todo cambio va en una **rama** (`feature/...`, `fix/...`, `infra/...`).

2. **Antes de empezar CUALQUIER cosa: sincroniza.**
   ```bash
   git fetch origin && git checkout main && git pull --ff-only origin main
   ```
   El desastre recurrente (ver `COORDINACION-IA/EN-USO.md`, historial) fue commitear sin
   hacer `pull` primero. No lo repitas.

3. **El deploy es AUTOMÁTICO: se despliega solo al mergear a `main`.**
   (`.github/workflows/deploy-cloudflare.yml`, con el secreto `CLOUDFLARE_API_TOKEN`.)
   - **NUNCA despliegues a mano.** `deploy-seguro.sh` está BLOQUEADO fuera de CI a
     propósito. Desplegar a mano deja producción adelante de git → la trampa de siempre.
   - Publicar = hacer merge de tu rama a `main`. Punto.

4. **Una rama por tarea; el nombre de la rama ES tu candado.** Dos cuentas nunca trabajan
   la misma rama a la vez → nunca se pisan. Pushea tu rama seguido (así la otra cuenta ve
   tu avance). El `EN-USO.md` solo hace falta si dos sesiones comparten la MISMA carpeta
   local en la MISMA máquina (raro); entre máquinas no sirve, las ramas sí.

5. **Nada entra a `main` sin estar 100% probado + ✓ de Inty.** Regla dura de Inty:
   **cero errores, nadie rompe nada.** Features a medias se quedan en su rama.

## Flujo completo (cópialo)
```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git checkout -b feature/mi-cosa            # tu rama = tu candado
# ...trabajas, commiteas, pusheas la rama seguido...
node tests/run.mjs                         # DEBE quedar 12/12 verde
git push -u origin feature/mi-cosa
# Inty prueba y aprueba →  recién ahí:
git checkout main && git pull --ff-only origin main
git merge feature/mi-cosa && git push      # esto dispara el deploy (~40s)
```

## Antes de un release (merge a main)
- Sube la versión en los **3 lugares**: `APP_VERSION` (index.html), `version.txt`, y la
  caché de `sw.js` (`vNNN`). Las tres deben coincidir.
- `node tests/run.mjs` → 12/12 verde.
- Prueba en navegador y, si toca UI, en el teléfono real de Inty.
- Verifica tras el deploy: `curl -s https://librepedal.cl/version.txt` debe dar la nueva.

## Método de diseño (UI)
Nada de UI se codea sin mockup aprobado por Inty. Ver
`COORDINACION-IA/METODO-TRABAJO-DISENO.md`. Íconos a medida, nunca genéricos/emoji.

## Punteros
- Estado y traspaso al día: `COORDINACION-IA/HANDOFF-CONTINUIDAD-2026-08-14.md`
- Candado (solo misma máquina/carpeta): `COORDINACION-IA/EN-USO.md`
- Repo canónico: este. App = un solo `index.html` (~10600 líneas, PWA Firebase, sin build).
