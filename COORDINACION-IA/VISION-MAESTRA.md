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
| **Visión Artificial** | ⬜ | No existe | Cámara + reconocimiento (montañas, aves, plantas, señales) y traducción — requiere una API de visión (ej. Workers AI ya tiene modelos de visión, evaluar costo/latencia) |
| **Clima Inteligente** | 🔶 | Clima real al pedirlo a Pistero, clima por cada parada del viaje al planificar | No hay monitoreo CONSTANTE con aviso proactivo antes de que aparezca la tormenta |
| **Seguridad** | ✅ | Detección de caídas (golpe + quietud), SOS con WhatsApp, avisos de hidratación por distancia | Deshidratación/calor/frío extremos no se infieren del clima real todavía; "zonas peligrosas" son solo reportes manuales de otros usuarios |
| **Comunidad** | ✅ | Reportes en ruta (peligros, agua, miradores, seguridad), CicloGuía (hospedajes, camping), +4.000 puntos reales de OSM | — |
| **Presupuesto Inteligente** | 🔶 | Calculadora de gastos estimados al planificar | No hay registro continuo de gastos reales del viaje ni alerta de "te estás pasando" |
| **Entrenador Personal** | 🔶 | Frases adaptadas a tu ritmo (lento/normal/rápido), avisos de pendiente/bajada, comparación con tu propio histórico | No hay recomendaciones de entrenamiento explícitas (series, descanso, progresión) |
| **Diario Automático** | 🔶 | Ciclo Bitácora, video 3D estilo Relive (recién arreglado en v6.01), perfil de elevación, resumen anual estilo Wrapped | Falta narración generada por IA y organización automática de fotos |
| **Personalidad** | ⬜ | Pistero tiene una sola personalidad fija (cercana, con humor sano) | No hay selector de estilos (aventurero/entrenador/relajado/humorístico/guía) |
| **Conversación natural** | ✅ | Se puede interrumpir a Pistero ("detente/cállate", v5.85), recuerda los últimos mensajes de la conversación | — |
| **Sin internet** | ✅ | Service worker, mapas de ruta descargables, guardado de rutas local-first (nunca se pierde una ruta grabada sin señal) | — |
| **Gamificación** | ✅ | Darma, logros, niveles, retos con meta de km, segmentos con tabla de líderes | — |
| **Inteligencia Predictiva** | ⬜ | Solo recordatorios a distancia fija (hidratar cada 5km, comer cada 20km) | Predicción real (anticipar cansancio/hambre/lluvia antes de que pase) requiere más señales (ritmo cardíaco si hay sensor, patrón histórico) |
| **Escalabilidad a otros deportes** | ⬜ | Arquitectura actual es específica de ciclismo | Decisión de arquitectura futura, no urgente |

---

## Cómo se usa este documento

1. **No es una lista de tareas para hacer todas de una vez.** Es el norte del
   producto. Cada sesión (Claude o Gemini) elige UN módulo o mejora concreta,
   la implementa con la misma disciplina de siempre (verificar, no romper nada,
   anotar en `BITACORA.md`), y lo tacha/actualiza acá.
2. Antes de construir algo "desde cero", revisar esta tabla — varias cosas del
   prompt maestro YA existen aunque con otro nombre (ej. "Entrenador Personal"
   ya vive parcialmente en las frases adaptativas y el comparador de ritmo).
3. Los ⬜ (Visión Artificial, Personalidad, Inteligencia Predictiva real,
   escalabilidad) son los huecos genuinos — ahí está el trabajo nuevo real.
4. Prioridad sugerida (a decidir con Inty, no asumir):
   **corto plazo** → Memoria más profunda (perfil persistente de preferencias) y
   Personalidad seleccionable (ambos son extensiones de lo que ya existe, bajo
   riesgo). **mediano plazo** → Clima proactivo, Presupuesto con registro real.
   **más grande/costoso** → Visión Artificial e Inteligencia Predictiva real.
