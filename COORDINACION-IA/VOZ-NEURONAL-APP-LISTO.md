# 🎙️ Voz neuronal en la app — CÓDIGO LISTO PARA PEGAR (sesión 1)

**Estado:** el BACKEND ya está LIVE y probado (commits `dc5e5a2` worker /tts + `9dc9368` Pistero proactivo).
Falta SOLO la parte de `index.html` (toggle + reproducción con fallback). **Está bloqueada por el
candado de sesión 2** (fix de navegación). En cuanto se libere, sesión 1 pega esto.

> **Sesión 2: la VOZ de la app la toma sesión 1.** No construyas TTS/voz neuronal, para no chocar.
> Tú sigue con navegación/lo tuyo. Gracias 🤝

---

## Lo que YA quedó live (Worker, no toca la app)
- Ruta **`GET IA_URL/?tts=<texto>`** → `{audio: "<base64 WAV>"}` con MeloTTS (`@cf/myshell-ai/melotts`), gratis.
  - Input correcto = `{prompt}` (NO mandar `lang`, gatilla 8002). A veces da un 3043 transitorio → por eso la app SIEMPRE cae a la voz nativa si falla.
- `personalidad()` ahora es **proactiva** (regla 8) y soporta `u.preferencias`.

## Cambios a aplicar en `index.html` (probados contra el código actual, líneas ~1877-1906)

### 1) Flag + estado (junto a `let vozCola=[]...`, línea ~1877)
```js
let vozMejorada = localStorage.getItem('lp_vozneural')==='on'; // voz neuronal (Worker) con fallback a nativa
let _vozNeuralAudio = null;
```

### 2) Refactor de `_reproducirVoz` (línea ~1890): sacar la voz nativa/web a un helper y anteponer la neural
```js
function _reproducirVoz(item){
  vozHablando=true;
  const durEst=Math.min(55000, Math.max(1800, item.limpio.length*75));
  mostrarBocadillo(item.t, durEst+600);
  _pisteroHabla(durEst);
  clearTimeout(vozTimerFin); vozTimerFin=setTimeout(_vozSiguiente, Math.round(durEst*1.4)+800);
  // Voz neuronal (más humana) si está activada y hay red; si falla o tarda, cae a la nativa.
  if(vozMejorada && navigator.onLine){ _vozNeural(item); return; }
  _vozNativaOWeb(item);
}
function _vozNativaOWeb(item){
  if(lpTTS.disponible()){ lpTTS.hablar(item.limpio); return; }
  if(!('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(item.limpio);
    u.lang='es-ES'; u.rate=1.05; u.pitch=1.08;
    if(vozPref) u.voice=vozPref;
    u.onend=u.onerror=function(){ clearTimeout(vozTimerFin); _vozSiguiente(); };
    speechSynthesis.speak(u);
  }catch(e){ clearTimeout(vozTimerFin); _vozSiguiente(); }
}
function _vozNeural(item){
  let cayo=false;
  const fallback=function(){ if(cayo) return; cayo=true; _vozNativaOWeb(item); };
  const ctrl=new AbortController();
  const to=setTimeout(function(){ try{ctrl.abort();}catch(e){} fallback(); }, 6000); // >6s = mejor voz nativa ya
  fetch(IA_URL+'?tts='+encodeURIComponent(item.limpio.slice(0,480)), {signal:ctrl.signal})
    .then(function(r){ return r.json(); })
    .then(function(d){
      clearTimeout(to);
      if(cayo) return;
      if(!d || !d.audio){ fallback(); return; }
      try{
        const a=new Audio('data:audio/wav;base64,'+d.audio);
        _vozNeuralAudio=a;
        a.onended=a.onerror=function(){ clearTimeout(vozTimerFin); _vozSiguiente(); };
        a.play().catch(function(){ fallback(); });
      }catch(e){ fallback(); }
    })
    .catch(function(){ clearTimeout(to); if(!cayo){ cayo=true; _vozNativaOWeb(item); } });
}
```

### 3) `pararVoz` (línea ~1879): parar también el audio neural
```js
function pararVoz(){ vozCola=[]; clearTimeout(vozTimerFin); vozHablando=false;
  try{ speechSynthesis.cancel(); }catch(e){}
  try{ lpTTS.stop(); }catch(e){}
  try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio=null; } }catch(e){}
  _pisteroCalla(); }
```

### 4) Toggle en Ajustes (junto al toggle de voz existente `toggleVoz`)
```js
function toggleVozNeural(){
  vozMejorada=!vozMejorada;
  localStorage.setItem('lp_vozneural', vozMejorada?'on':'off');
  const b=document.getElementById('vozNeuralBtn');
  if(b) b.innerHTML='<i class="fas fa-wand-magic-sparkles"></i> Voz mejorada: '+(vozMejorada?'ON':'OFF');
  if(vozMejorada) h('Voz mejorada activada. Escúchame ahora.'); // se oye ya con la voz neuronal
}
```
Y el botón en el panel de Ajustes: `<button class="ab" id="vozNeuralBtn" onclick="toggleVozNeural()">🪄 Voz mejorada: OFF</button>`
(mostrar un aviso chico: "usa datos, ~0,3–0,8 MB por frase; si no hay señal usa la voz normal").

### 5) Enviar `preferencias` al Worker (donde se arma el `payload` de chat, ~línea 2400)
Agregar al objeto `usuario` del payload: `preferencias: localStorage.getItem('lp_prefs')||''`
(se irá llenando cuando el usuario cuente comida/terreno/presupuesto que le gustan — futuro cercano).

## Notas de calidad
- **Datos móviles:** el WAV pesa ~0,3–0,8 MB/frase. Por eso es OPT-IN y solo online. A futuro: cachear frases frecuentes en IndexedDB y/o comprimir.
- **Fallback probado en teoría contra 3043/timeout/offline** → nunca deja a Pistero mudo.
- **Ducking:** el `<audio>` neural convive con `lpMusic.duck()` igual que la voz nativa (ya se llama en `_pisteroHabla`).
