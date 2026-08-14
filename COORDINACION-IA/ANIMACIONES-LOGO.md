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
