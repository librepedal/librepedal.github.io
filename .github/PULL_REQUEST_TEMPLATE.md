<!--
Este checklist existe porque el mismo tipo de error se repitió 4 veces seguidas
en la revisión de Google Play (Prominent Disclosure) y varios hallazgos de
seguridad llevaban semanas en producción sin que nadie los buscara. La causa de
fondo no era falta de cuidado puntual, era que "verificar bien" dependía de que
cada sesión se acordara de hacerlo. Esto lo hace explícito y visible en cada PR.
No se puede mergear sin marcar lo que aplica.
-->

## Qué cambia y por qué


## Checklist (marca lo que aplica; si algo no aplica, dilo, no lo borres)

- [ ] **Grep exhaustivo del patrón**, no solo el caso reportado — si esto arregla un bug, busqué TODOS los call-sites del mismo patrón en el repo (`grep -rn`), no solo el que falló.
- [ ] **Tests**: agregué o actualicé un test en `tests/` que falla si esto se rompe de nuevo. Si no se puede testear (requiere dispositivo real), lo digo explícito abajo.
- [ ] **Firestore rules**: si toqué `firestore.rules`, validé el campo/colección real que el cliente escribe (grep del `.add()`/`.set()`/`.update()` real) antes de exigir algo nuevo — no adivino nombres de campo.
- [ ] **Verificación real**: corrí esto (navegador local, o dispositivo real si toca ubicación/permisos nativos/SOS) — no solo leí el código y asumí que funciona.
- [ ] **Riesgo físico o de seguridad** (ubicación, SOS, detección de caídas, pagos): si el cambio toca alguna de estas áreas, lo probé en dispositivo real o digo explícitamente por qué no se pudo.
- [ ] **`npm test` pasa en verde** localmente antes de abrir este PR.

## Qué NO pude verificar (sé honesto, no lo omitas)

