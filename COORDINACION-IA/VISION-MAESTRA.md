# 🧭 Visión maestra — Libre Pedal

Documento de referencia para AMBAS IAs (Claude y Gemini). Escrito por Inty
(2026-07-11) como el "prompt maestro" del proyecto: la app de cicloturismo con IA
más avanzada del mundo, un compañero de viaje, no un GPS que lee instrucciones.

**Regla de oro**: nada de lo que ya funciona se rompe para construir esto. Cada
módulo nuevo se agrega sin tocar lo que ya está probado, siguiendo el protocolo de
`LEEME.md` (versión sincronizada, verificar antes de desplegar, anotar en `BITACORA.md`).

---

## Estado real por módulo (auditado 2026-07-11, v6.01)

Leyenda: ✅ existe y funciona · 🔶 existe parcial/básico · ⬜ no existe todavía

| Módulo del prompt maestro | Estado | Qué hay hoy | Qué falta para el nivel del prompt maestro |
|---|---|---|---|
| **Copiloto Inteligente** | ✅ | Chat "Pregúntale a Pistero" (v5.91+), responde por texto/voz, obedece órdenes (`[ACCION:...]`), busca en Wikipedia y clima real (v5.96) | Anticiparse proactivamente sin que se lo pidan (hoy solo responde, no inicia) |
| **Memoria** | 🔶 | `pisteroHistorial` (últimos 16 mensajes, localStorage) + `_pisteroContexto()`: últimas 4 rutas nombradas, vel. media, viajes completados, hora | No guarda preferencias explícitas (comida favorita, terreno preferido, presupuesto habitual, descansos típicos) como perfil persistente y creciente |
| **Planificador** | ✅ | Viajes multi-destino, calculadora de gastos con km reales (OSRM), hospedajes de la comunidad | Integrar clima/dificultad/desnivel al plan automáticamente (hoy es manual) |
| **Turismo Inteligente** | 🔶 | Anécdotas reales por Wikipedia geolocalizada durante la ruta (no inventa nada) | Profundidad narrativa sistemática (historia, leyendas, pueblos originarios) — hoy depende de qué haya en Wikipedia del punto exacto |
| **Visión Artificial** | ❌ DESCARTADA | No existe | Inty la descartó explícitamente (2026-07-11): no aplica al proyecto. **No construir esto**, ni siquiera para arreglar bicicletas con la cámara. |
| **Clima Inteligente** | 🔶 | Clima real al pedirlo a Pistero, clima por cada parada del viaje al planificar | No hay monitoreo CONSTANTE con aviso proactivo antes de que aparezca la tormenta |
| **Seguridad** | ✅ | Detección de caídas (golpe + quietud), SOS con WhatsApp, avisos de hidratación por distancia | Deshidratación/calor/frío extremos no se infieren del clima real todavía; "zonas peligrosas" son solo reportes manuales de otros usuarios |
| **Comunidad** | ✅ | Reportes en ruta (peligros, agua, miradores, seguridad), CicloGuía (hospedajes, camping), +4.000 puntos reales de OSM | — |
| **Presupuesto Inteligente** | 🔶 | Calculadora de gastos estimados al planificar | No hay registro continuo de gastos reales del viaje ni alerta de "te estás pasando" |
| **Entrenador Personal** | 🔶 | Frases adaptadas a tu ritmo (lento/normal/rápido), avisos de pendiente/bajada, comparación con tu propio histórico | No hay recomendaciones de entrenamiento explícitas (series, descanso, progresión) |
| **Diario Automático** | 🔶 | Ciclo Bitácora, video 3D estilo Relive (recién arreglado en v6.01), perfil de elevación, resumen anual estilo Wrapped | Falta narración generada por IA y organización automática de fotos |
| **Personalidad** | ✅ (v6.02) | Selector en Perfil: cercano/aventurero/entrenador/relajado/humorístico/guía turístico. Cambia el tono, no la identidad. Default = comportamiento de siempre | Los tonos son sutiles con el modelo actual (Llama 3.3 fp8) — podría afinarse más con prompts más largos por tono si se nota poco distinguible en uso real |
| **Conversación natural** | ✅ | Se puede interrumpir a Pistero ("detente/cállate", v5.85), recuerda los últimos mensajes de la conversación | — |
| **Sin internet** | ✅ | Service worker, mapas de ruta descargables, guardado de rutas local-first (nunca se pierde una ruta grabada sin señal) | — |
| **Gamificación** | ✅ | Darma, logros, niveles, retos con meta de km, segmentos con tabla de líderes | — |
| **Inteligencia Predictiva** | 🔶 (v6.02) | **Lluvia proactiva**: chequea pronóstico horario cada ~20 min en ruta, avisa si vienen 2h con >60% probabilidad ANTES de que llueva. **Cansancio**: compara tu ritmo real de los primeros 15 min vs una ventana móvil de los últimos 15 min, avisa si cae ≥25% tras 40+ min activo | Hambre no se predice (sigue siendo aviso a distancia fija); sin sensor de pulso no hay señal fisiológica real, solo velocidad como proxy |
| **Escalabilidad a otros deportes** | ✅ (v6.02, base real) | Selector de actividad en Perfil (Ciclismo/MTB/Trekking/Moto-Auto) cambia el **perfil real de ruteo OSRM** (cycling/foot/driving, verificado en vivo) y el lenguaje de Pistero (sin mencionar bicicleta si no aplica) | Trekking/Moto son modos base — falta pulir detalles propios de cada uno (ej. puntos de interés específicos de trekking, gasolineras para moto). Visión Artificial descartada explícitamente por Inty, no se construye |

---

## Cómo se usa este documento

1. **No es una lista de tareas para hacer todas de una vez.** Es el norte del
   producto. Cada sesión (Claude o Gemini) elige UN módulo o mejora concreta,
   la implementa con la misma disciplina de siempre (verificar, no romper nada,
   anotar en `BITACORA.md`), y lo tacha/actualiza acá.
2. Antes de construir algo "desde cero", revisar esta tabla — varias cosas del
   prompt maestro YA existen aunque con otro nombre (ej. "Entrenador Personal"
   ya vive parcialmente en las frases adaptativas y el comparador de ritmo).
3. **Visión Artificial: NO construir.** Inty la descartó explícitamente. No proponerla
   de nuevo salvo que él la pida.
4. (2026-07-11, v6.02) Personalidad, Predicción real (lluvia+cansancio) y
   Escalabilidad a otros deportes → **implementadas**, ver tabla arriba y `BITACORA.md`.
5. Huecos que siguen abiertos: **Memoria más profunda** (perfil persistente de
   preferencias, no solo últimas rutas), **Presupuesto con registro real** (no solo
   estimado), **Diario con narración generada**, **Turismo con profundidad
   sistemática**. Prioridad a decidir con Inty, no asumir.
