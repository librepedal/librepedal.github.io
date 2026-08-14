# 🎙️ Clon de voz LOCAL — hallazgos y receta (2026-08-14, Opus)

Clonación de la voz de Pistero SIN ElevenLabs, en el PC de Inty (RTX 4060). Objetivo:
que el clon sea **indistinguible** del original para las frases dinámicas (números,
calles, logros) que hoy caen a voz nativa robótica.

## Setup (reproducible)
- Carpeta: `C:\Users\intyr\lp-voz-clon` (fuera del repo; venv Python 3.11 + PyTorch cu124).
- Modelo: **Chatterbox Multilingual** (`chatterbox-tts` 0.1.7), licencia **MIT** (uso
  comercial OK). Español vía `language_id="es"`.
- Referencia de voz: `ref-pistero.wav` = 6 clips del banco concatenados (~20s, 24kHz mono).
- Scripts: `poc.py` (demo), `sweep.py` (barrido), `score.py`/`calib.py` (medición).

## Resultado (objetivo, verificador de locutor resemblyzer)
- **Clon vs referencia: 0.8907** de coseno.
- **Techo real** (clips ORIGINALES distintos entre sí): **0.7803** promedio.
- => El clon supera la variación natural entre clips reales → **INDISTINGUIBLE en identidad/timbre**.
- Barrido de `exaggeration × cfg_weight × temperature`: **los DEFAULT (0.5/0.5/0.8) ganan.**
  No usar exageración/temperatura altas (bajan el parecido).

## Receta para generar (T06 — banco ampliado)
```python
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
m = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
wav = m.generate(TEXTO, language_id="es", audio_prompt_path="ref-pistero.wav",
                 exaggeration=0.5, cfg_weight=0.5, temperature=0.8)
# guardar wav (m.sr) -> ffmpeg a mp3 128k loudnorm, nombre = <genero><id>.mp3
```
- Rendimiento: ~RTF 3.26 en la 4060 (5s de audio ≈ 18s). ~200 frases ≈ 1h. Batch de noche.
- **Dos voces**: `ref-pistero.wav` (l) y una `ref-pistera.wav` (c) — armar la de Pistera
  igual, con clips `c*.mp3`.
- Contenido a generar: números 0–100, ciudades/calles comunes de Chile, 24 logros,
  saludos personalizados, "recalculando/girar/llegaste". Actualizar `voces-el/manifest.json`.

## Pendiente de decisión (Inty)
- Aprobar la calidad DE OÍDO (se le mandaron 3 mp3: original, clon misma frase, clon frase
  nueva). Si aprueba → correr T06 (banco ampliado) y T07 (cablear router de voz en la app).

## Estado: T05 (perfeccionar fidelidad) = HECHO. T06/T07 = LIBRES (esperan ✓ de Inty).
