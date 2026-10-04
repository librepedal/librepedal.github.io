# Pistero en ruta: copiloto breve y directo (2026-10-04)

Rama `fix/pistero-copiloto`, SIN mergear. Aprobado por Inty (tabla de frases en el commit 36f5c3d).

**Decisión de Inty: NO publicar hasta tener las frases pregrabadas** (para no gastar ElevenLabs en vivo).

Falta antes de mergear:
1. Pregrabar las frases fijas nuevas: "Un tercio. Buen ritmo.", "Mitad del camino.", "Dos tercios. Queda poco.",
   "5 km. Buen ritmo.", "15 km. Vas bien.", "Grabando. Vamos.", "Empieza una subida.", "Bajada larga.",
   "Tormenta cerca. Busca dónde parar.", "Llegaste.", "Tu viaje más largo.", y las de "Pistero habla".
   Necesita `MI-ELEVENLABS.txt` (no está en la máquina flgan). Generador de referencia:
   `scripts/gen-voz-bienvenida.js` en la rama `feature/bienvenida-fondo`.
2. Frases con números o lugares ("22 km a Llifén", "Subida fuerte, 800 metros", "Llegaste. 22 km en 1:18"):
   armarlas con trozos pregrabados (números, "km a", "metros", etc.) para no usar voz en vivo.
3. Probar pedaleando en el teléfono + ✓ de Inty.
