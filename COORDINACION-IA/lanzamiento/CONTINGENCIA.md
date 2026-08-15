# 🛡️ Plan de contingencia — Libre Pedal

Cómo la app responde ante cada situación adversa, para que NADA la rompa en plena ruta.
Actualizado 2026-07-11 · v6.00.

| Situación adversa | Qué hace la app (contingencia) |
|---|---|
| **Un error/bug suelto en el código** | Red de seguridad global (`window.error` + `unhandledrejection`) lo captura, lo manda a **Sentry** y la app **sigue andando**. No hay pantalla en blanco. |
| **Sin señal / internet intermitente** | Todas las peticiones críticas (buscar destino, ruteo) tienen **timeout** (`_fetchT`, 12–15s): fallan rápido con mensaje amable ("estás sin señal, prueba de nuevo") en vez de colgarse para siempre. |
| **Un servicio externo caído** (OSRM, Nominatim, Open-Meteo, IA) | Cada `fetch` está en try/catch con fallback: el mapa sigue, la ruta avisa "no pude calcular", la IA responde "se me cortó", el clima se omite. Ninguno tumba la app. |
| **Datos guardados corruptos** | Lectura segura de `localStorage` (`_lsJSON`): si un dato se corrompe, usa el valor por defecto en vez de crashear el arranque. |
| **GPS con mala señal / velocidad fantasma** | Badge "buscando señal GPS", velocidad por **ventana de desplazamiento real** (promedia el ruido), y filtro de fixes imprecisos (>30–35 m). |
| **Pantalla apagada** | Plugin nativo `BackgroundGeolocation` (foreground service) sigue grabando + `WakeLock`. SOLO en el APK — ver PENDIENTES si el build lo perdió. Diagnóstico: Ajustes → 📡 Probar GPS. |
| **Recálculo falso de ruta** | `verificarDesviacion` mide contra **toda la ruta** (punto-a-segmento), no solo el paso actual; + freno anti-loop (22s/4 fixes/backoff). |
| **Destino no encontrado** (nombre raro / voz mal transcrita) | `geocodeDestino` reintenta con **variantes fonéticas** (Kiman→Quimán); si aún no, recomienda **marcar en el mapa**. |
| **El mapa no carga** (WebGL / sin unpkg) | Mensaje claro `_mapaFalloVisible` en vez de pantalla rota. |
| **Voz/micrófono no disponible** (WebView) | Fallback: avisa y enfoca el campo de texto para escribir; en Chrome la voz funciona. Mic nativo wireado para cuando el APK traiga el plugin. |
| **Emergencia (SOS)** | Varios caminos: WhatsApp a contactos guardados, o `navigator.share`, o abre WhatsApp genérico; con o sin GPS (usa última ubicación conocida). Nunca depende de un solo canal. |
| **Caída detectada** | Aviso "¿estás bien?" con cuenta regresiva antes de preparar el SOS (no dispara solo). |
| **Versión vieja cacheada** | Auto-reparación comparando `version.txt` vs `APP_VERSION` (con freno anti-bucle). |

## Regla contra regresiones
Ver **`LEEME.md` → 🛡️ PROTEGIDO**: lista de funciones ya resueltas que NO se deben romper. Antes de tocar algo cercano, léela y prueba.

## Lo que aún depende de terceros (no es contingencia de código)
- Rastreo pantalla apagada: necesita el plugin en el **APK** (Gemini).
- OSRM/Nominatim son servidores **demo**: para escala real, migrar (ver PENDIENTES).
