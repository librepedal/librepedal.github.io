# Animaciones del logo del login — banco de opciones

Inty eligió **"Revelado"** para el login (v7.83): el logo se dibuja desde el centro
(`@keyframes lpReveal` sobre `.lp-logo-wrap`, clip-path circle 0→100%). Aquí quedan
**las otras** que se le mostraron, listas para reusar. Se aplican al `.lp-logo-wrap`
(logo+rueda juntos), o a `.lp-wheel` / `.lp-logo-center` según el caso.

## Elegida (en producción)
```css
.lp-logo-wrap{animation:lpReveal 1.2s cubic-bezier(.5,0,.3,1) both}
@keyframes lpReveal{0%{clip-path:circle(0% at 50% 50%);opacity:0;transform:scale(.92)}60%{opacity:1}100%{clip-path:circle(100% at 50% 50%);opacity:1;transform:scale(1)}}
```

## Guardadas para después

**A · Giro suave** (rueda gira lento + respira con brillo)
```css
.lp-wheel{animation:spin 5s linear infinite}
.lp-logo-wrap{animation:breathe 3s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes breathe{0%,100%{filter:drop-shadow(0 0 3px rgba(252,76,2,.25))}50%{filter:drop-shadow(0 0 12px rgba(252,76,2,.5))}}
```

**B · Rodando** (bota y se mece como si rodara)
```css
.lp-wheel{animation:spin 1.9s linear infinite}
.lp-logo-wrap{animation:roll 1.2s ease-in-out infinite}
@keyframes roll{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8px) rotate(4deg)}}
```

**D · Arranque** (acelera y frena, pedalada)
```css
.lp-wheel{animation:accel 2.4s cubic-bezier(.66,0,.34,1) infinite}
@keyframes accel{to{transform:rotate(360deg)}}
```

**E · Rebote elástico** (el logo del centro cae y rebota)
```css
.lp-logo-center{animation:bounce 2s cubic-bezier(.3,.85,.4,1) infinite}
@keyframes bounce{0%{transform:translate(-50%,-150%) scale(.6);opacity:0}28%{transform:translate(-50%,-50%) scale(1.15);opacity:1}42%{transform:translate(-50%,-58%) scale(.94)}56%{transform:translate(-50%,-50%) scale(1.05)}70%,100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
```

**F · Órbita de luz** (un punto de luz recorre el borde; loader neón). Requiere un
`<span class="orbit"><span class="dot"></span></span>` dentro del wrap.
```css
.orbit{position:absolute;inset:0;animation:spin 1.5s linear infinite}
.dot{position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:50%;background:#ffd0a8;box-shadow:0 0 12px 4px rgba(252,76,2,.85),0 0 4px 1px #fff}
```

**G · Volteo 3D** (moneda que gira y cae de frente; el stage necesita `perspective:600px`)
```css
.lp-logo-wrap{transform-style:preserve-3d;animation:flip3d 3.4s cubic-bezier(.4,0,.2,1) infinite}
@keyframes flip3d{0%{transform:rotateY(0)}70%{transform:rotateY(720deg)}100%{transform:rotateY(720deg)}}
```

**H · Zoom cine** (emerge del fondo y enfoca)
```css
.lp-logo-wrap{animation:zoomIn 3.2s ease-in-out infinite}
@keyframes zoomIn{0%{transform:scale(.15);opacity:0;filter:blur(6px)}35%{opacity:1;filter:blur(0)}55%{transform:scale(1.06)}70%,100%{transform:scale(1);opacity:1;filter:blur(0)}}
```

**J · Brillo metálico** (un destello barre el logo; requiere `overflow:hidden` en el
contenedor y un `<span class="glint">`)
```css
.glint{position:absolute;top:-25%;left:-70%;width:45%;height:150%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);transform:rotate(18deg);animation:glint 2.8s ease-in-out infinite}
@keyframes glint{0%{left:-70%}55%{left:140%}100%{left:140%}}
```

**L · Neón + aros** (late en naranja y lanza aros; requiere 2 `<span class="ring">`)
```css
.lp-logo-center{animation:neon 1.9s ease-in-out infinite}
@keyframes neon{0%,100%{filter:drop-shadow(0 0 3px rgba(252,76,2,.4)) brightness(1)}50%{filter:drop-shadow(0 0 14px rgba(252,76,2,.95)) brightness(1.2)}}
.ring{position:absolute;top:50%;left:50%;width:100%;height:100%;transform:translate(-50%,-50%);border-radius:50%;border:2px solid rgba(252,76,2,.5);animation:ripple 1.9s ease-out infinite}
.ring.r2{animation-delay:.95s}
@keyframes ripple{0%{transform:translate(-50%,-50%) scale(.7);opacity:.75}100%{transform:translate(-50%,-50%) scale(1.45);opacity:0}}
```

## N · Pulso de ruta en oro cepillado (2026-08-14, la más reciente — colores y animación
YA aprobados por Inty en vivo, no aplicada a `index.html` todavía)

Iterada hoy con Inty viendo cada versión (empezó como opción D de un banco de 6, quedó
sola tras su feedback). Resuelve algo que las opciones de arriba no tenían: **el
neumático (`#241612`/`#0d0906`, casi negro) se pierde contra el fondo real de la app
(`#0a0f1d`, también casi negro)** — negro sobre negro, sin contraste. Se corrigió con
teoría de color real, no bajando el brillo: bronce cálido (contraste de matiz, cálido vs.
el navy frío del fondo) + un filo de luz fino en el borde exterior (rim light, la misma
técnica que usa fotografía de producto para separar un objeto oscuro de un fondo oscuro)
+ una veta especular arriba-izquierda simulando luz pegándole al caucho.

**Necesita un asset nuevo:** `COORDINACION-IA/logo-transparent-gold.png` (ya generado,
mismo tamaño que el original 1251×1280 — el acento naranja del logo real recoloreado a
oro por script, blanco/contorno intactos) en vez de `logo-transparent.png`. Si se aplica,
mover ese archivo a la raíz (o donde corresponda) y actualizar el `src` de `.lp-logo-center`.

**Pendiente que Inty mencionó y no se hizo esta sesión (por regla, no se gasta crédito de
Claude generando media):** pasar la textura del medallón (rueda+neumático) por
ComfyUI en el Thunder para un oro cepillado renderizado de verdad, más fino que el
degradado SVG de abajo. Si se quiere, es tarea para el hub (Capone→hub→Tundra), no
para esta sesión.

```css
/* reemplaza lpSpin por rueda-libre real: arranca y frena como una rueda de bici */
.lp-wheel{animation:aCoast 6s cubic-bezier(.22,.9,.36,1) infinite}
@keyframes aCoast{0%{transform:rotate(0)}10%{transform:rotate(400deg)}35%{transform:rotate(760deg)}60%{transform:rotate(980deg)}85%{transform:rotate(1060deg)}100%{transform:rotate(1080deg)}}

/* pulso de ubicacion: 3 anillos que nacen del centro y se desvanecen, requiere
   <span class="ring p1"></span><span class="ring p2"></span><span class="ring p3"></span>
   dentro de .lp-logo-wrap, ademas de la rueda y el logo */
.ring{position:absolute;top:50%;left:50%;width:100%;height:100%;transform:translate(-50%,-50%);
  border-radius:50%;border:1.6px solid;border-image:linear-gradient(135deg,#fff2c4,#ffcf40,#b5820f) 1;
  animation:ringPulse 2.8s ease-out infinite;opacity:0;
  filter:drop-shadow(0 0 4px rgba(255,207,64,.6))}
.ring.p2{animation-delay:.93s}
.ring.p3{animation-delay:1.86s}
@keyframes ringPulse{0%{transform:translate(-50%,-50%) scale(.7);opacity:.9}100%{transform:translate(-50%,-50%) scale(1.35);opacity:0}}
```

```svg
<!-- dentro del <svg class="lp-wheel">, reemplaza los stroke="#241612"/"#0d0906"/"#e08a4a"
     por estos gradientes (agregar a <defs>, o a un <defs> nuevo si el SVG no tiene uno) -->
<defs>
  <radialGradient id="lpGold" cx="38%" cy="30%" r="75%">
    <stop offset="0%" stop-color="#fffae0"/><stop offset="24%" stop-color="#ffe066"/>
    <stop offset="50%" stop-color="#f0a800"/><stop offset="78%" stop-color="#a8650a"/>
    <stop offset="100%" stop-color="#6b3f08"/>
  </radialGradient>
  <linearGradient id="lpTire" x1="15%" y1="10%" x2="85%" y2="90%">
    <stop offset="0%" stop-color="#7a4a18"/><stop offset="35%" stop-color="#4a2c0d"/>
    <stop offset="70%" stop-color="#2c1908"/><stop offset="100%" stop-color="#1a0f05"/>
  </linearGradient>
  <linearGradient id="lpRimLight" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffe9b0" stop-opacity=".9"/><stop offset="50%" stop-color="#ffcf6b" stop-opacity=".15"/>
    <stop offset="100%" stop-color="#ffe9b0" stop-opacity=".55"/>
  </linearGradient>
</defs>
<!-- neumatico: stroke="url(#lpTire)" en vez de #241612 -->
<!-- filo de luz nuevo, agregar despues del neumatico: -->
<circle cx="50" cy="50" r="44.6" fill="none" stroke="url(#lpRimLight)" stroke-width="1.1" opacity=".85"/>
<!-- veta especular nueva, agregar despues del filo de luz: -->
<path d="M 24 26 A 40 40 0 0 1 62 15.5" fill="none" stroke="#ffdca0" stroke-width="2.2" stroke-linecap="round" opacity=".4"/>
<!-- aro interior y radios: stroke="url(#lpGold)" en vez de #e08a4a -->
```
