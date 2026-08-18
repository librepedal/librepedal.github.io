# Traspaso — rediseño de Pistero a capas transparentes (2026-08-17)

Continuación de [[BIBLIA-PISTERO-2026-08-15]]. Esta sesión partió corrigiendo el método:
todo lo hecho hasta el 16-08 es personaje COMPLETO horneado por variante (ej.
`casco-naranja.png` = Pistero entero con casco naranja). Inty pidió rehacer TODO como
capas independientes con fondo transparente, para poder combinar libremente piel + casco +
lentes + accesorio en la app (el usuario elige cada cosa por separado).

## ⚠️ Protocolo de seguridad de GPU — leer antes de generar nada

Esta sesión gatilló **dos crashes de máquina** (reinicio duro) generando en cadena con dos
instancias de ComfyUI corriendo a la vez. Diagnóstico real vía Event Viewer (no adivinado):
**bugcheck `0x113` (`VIDEO_DXGKRNL_FATAL_ERROR`, driver NVIDIA)** — es un problema
PREEXISTENTE de esta máquina (mismo error el 10, 11 y 15 de agosto), pero correr 2
instancias pesadas a la vez en la GPU de 8GB (RTX 4060 Laptop) es un gatillo real.

**Reglas obligatorias de acá en adelante:**
1. Antes de levantar una instancia propia en :8189, chequear `curl -s -m 3
   http://127.0.0.1:8188/system_stats` — si la principal de Inty está activa, usar ESA
   directamente (coordinar, no sumar una segunda carga de modelo).
2. No encadenar 8-10 generaciones seguidas sin pausa para iterar un prompt. Espaciar.
3. Si Inty pide "sin iterar", es literal: un intento, se acepta el resultado tal cual.

Detalle completo guardado en memoria persistente `proteccion-gpu-comfyui-kpone`.

## Base oficial confirmada

`pistero_oficial_base.png` (carpeta `input` compartida de ComfyUI, generada 16-ago ~17:00,
**fondo verde plano** — es a propósito, para chroma-key limpio, NO es el resultado final).
**NO usar** `pistero_base.png` ni `pistero_face.png` (base vieja, anillo azul + fondo
oscuro) — quedaron obsoletas, aunque siguen físicamente en la carpeta.

Extraída ya con transparencia real (canal alpha, no verde) en el scratchpad de esta
sesión como `base-oficial-transparente-v2.png` — falta subirla al repo en
`disenos-ui/pistero-3d/aprobadas/pistero-base-transparente.png` si se pierde el scratchpad.

## Lecciones técnicas nuevas (además de las ya documentadas en la Biblia)

- **Pañoleta ≠ buff.** Vocabulario "tubular/seamless" (el correcto para buff) hace que una
  pañoleta salga con forma de mascarilla quirúrgica. Usar vocabulario de bandana real: tela
  atada, nudo visible, punta colgando, pliegues de tela suelta. Negativo explícito contra
  "N95, respirator, duckbill mask, pleated, surgical mask".
- **Máscaras geométricas anchas (oreja a oreja) se salen de la silueta real si no se capan.**
  Medir el contorno real por fila de píxeles (distancia de color contra el verde) y hacer
  `np.minimum(mascara_generosa, silueta_real)` — si no, sale un halo traslúcido feo donde
  la máscara pisa el fondo.
- **No hace falta que un accesorio nuevo "esconda" accesorios existentes (correa del
  casco, etc.) en la generación.** Al componerse en capas, donde la capa nueva no cubre, se
  ve la capa de abajo — que es lo correcto. Se gastaron ~10 generaciones de más
  persiguiendo esto antes de notarlo.
- **Generar accesorios de cara sobre la base CON casco+lentes puestos genera choques
  innecesarios** (correa, puente de lentes). Mejor: generar sobre una base "cara pelada"
  (sin casco, sin lentes) y apilar casco/lentes como sus propias capas después. Mask ya
  armada para sacar casco+lentes: `pistero_oficial_helmet_glasses_mask.png` (cubre
  aprox. x35-475, y0-315 sobre `pistero_oficial_base.png`). **Pendiente**: la generación de
  esta base "cara pelada" quedó interrumpida por el crash de GPU, no se llegó a completar.

## Pendiente de decisión de Inty (no técnico)

Piel (tono) y ánimos (expresión) modifican la base del personaje mismo — no son objetos
superponibles como capa igual que casco/lentes/accesorios. Falta que Inty confirme que
quedan como variantes de base (no parte del sistema de capas), o si quiere otra cosa.

## Estado del catálogo transparente (todo pendiente de reintentar con el método correcto)

Nada de lo generado en capas transparentes esta sesión quedó aprobado/pusheado — la
pañoleta pasó por ~10 iteraciones sin cerrar limpio antes del pivote a "cara pelada", y ese
pivote quedó cortado por el crash. **Empezar de nuevo la pañoleta sobre la base "cara
pelada"** una vez esa base exista, en vez de retomar los intentos de esta sesión.

Related: `BIBLIA-PISTERO-2026-08-15.md`, `METODO-DE-TRABAJO-INTY.md`.
