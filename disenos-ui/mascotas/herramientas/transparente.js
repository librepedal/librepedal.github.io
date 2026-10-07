/* Deja con fondo transparente las imágenes de Gemini (fondo azul marino liso con viñeta).
   Cómo: estima el color del fondo en cada punto con una superficie curva (x, y, x², y², x·y: sigue la viñeta) ajustada a los bordes,
   y desde los bordes avanza solo por lo que se parece al fondo. La transparencia sale de qué tan
   lejos está cada píxel del fondo (bordes del pelaje suaves) y al color del borde se le quita el
   azul que traía ("despill"). Se recorta al contenido con un margen.
   Uso (necesita pngjs y jpeg-js, instalados fuera del repo):
     NODE_PATH=<carpeta>/node_modules node transparente.js <entrada.png|jpg> <salida.png> [ancho]
   [ancho]: ancho al que se lleva la FOTO completa (no el recorte), así todas quedan a la misma escala.  */
const fs=require('fs'),{PNG}=require('pngjs'),jpeg=require('jpeg-js');
const [,,ent,sal,anchoTxt]=process.argv;
const buf=fs.readFileSync(ent);
const img=/\.png$/i.test(ent)?PNG.sync.read(buf):jpeg.decode(buf,{useTArray:true});
const W=img.width,H=img.height,p=img.data;

// 0) las capturas traen una línea oscura en el borde: se descartan 4 px
const BOR=4;
// 1) fondo: superficie cuadrática por canal ajustada con un marco de 40 px (sin el borde descartado)
const M=40, N=6, base=(x,y)=>{const u=x/W,v=y/H;return [1,u,v,u*u,v*v,u*v]};
const A=Array.from({length:N},()=>new Array(N).fill(0)), B=[0,1,2].map(()=>new Array(N).fill(0));
for(let y=BOR;y<H-BOR;y+=2)for(let x=BOR;x<W-BOR;x+=2){
  if(x>=M&&x<W-M&&y>=M&&y<H-M)continue;
  const i=(y*W+x)*4, v=base(x,y);
  for(let a=0;a<N;a++){for(let b=0;b<N;b++)A[a][b]+=v[a]*v[b];for(let c=0;c<3;c++)B[c][a]+=v[a]*p[i+c]}
}
function resolver(A,b){ // Gauss NxN
  const m=A.map((r,k)=>[...r,b[k]]);
  for(let c=0;c<N;c++){let mx=c;for(let r=c+1;r<N;r++)if(Math.abs(m[r][c])>Math.abs(m[mx][c]))mx=r;[m[c],m[mx]]=[m[mx],m[c]];
    for(let r=0;r<N;r++)if(r!==c){const f=m[r][c]/m[c][c];for(let k=c;k<=N;k++)m[r][k]-=f*m[c][k]}}
  return m.map((r,k)=>r[N]/r[k]);
}
const coef=[0,1,2].map(c=>resolver(A,B[c]));
const fondo=(x,y,c)=>{const v=base(x,y);let s=0;for(let k=0;k<N;k++)s+=coef[c][k]*v[k];return s};

// 2) distancia al fondo y relleno desde los bordes por lo que es fondo o borde suave
const T0=26, T1=70; // bajo T0 es fondo; sobre T1 es pudú; entre medio, semitransparente
const d=new Float32Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;let s=0;for(let c=0;c<3;c++){const e=p[i+c]-fondo(x,y,c);s+=e*e}d[y*W+x]=Math.sqrt(s);
  // la sombra del piso que dibuja Gemini es azul oscuro: cuenta como fondo (el pudú es café: rojo > azul)
  if(p[i+2]>p[i]+20&&p[i+2]>=p[i+1])d[y*W+x]=Math.min(d[y*W+x],T0)}
const alfa=new Float32Array(W*H).fill(1), vis=new Uint8Array(W*H), pila=[];
for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x<BOR||y<BOR||x>=W-BOR||y>=H-BOR){const k=y*W+x;vis[k]=1;alfa[k]=0;if(x===BOR-1||y===BOR-1||x===W-BOR||y===H-BOR)pila.push(k)}
for(const k of pila.slice()){vis[k]=0}
while(pila.length){const k=pila.pop();if(vis[k])continue;vis[k]=1;
  if(d[k]>=T1)continue;                       // ya es pudú: no se sigue
  alfa[k]=Math.max(0,(d[k]-T0)/(T1-T0));
  if(d[k]>T0+ (T1-T0)*.6)continue;            // borde: se suaviza pero no se cruza
  const x=k%W,y=(k/W)|0;if(x>0)pila.push(k-1);if(x<W-1)pila.push(k+1);if(y>0)pila.push(k-W);if(y<H-1)pila.push(k+W)}
// huecos de fondo encerrados (entre las patas, bajo la panza): si son grandes y del color del fondo, también se vacían
{const v2=new Uint8Array(W*H);
 for(let k0=0;k0<W*H;k0++){if(vis[k0]||v2[k0]||d[k0]>=T0+8)continue;const comp=[],st=[k0];v2[k0]=1;
   while(st.length){const k=st.pop();comp.push(k);const x=k%W,y=(k/W)|0;
     for(const q of [x>0?k-1:-1,x<W-1?k+1:-1,y>0?k-W:-1,y<H-1?k+W:-1])if(q>=0&&!vis[q]&&!v2[q]&&d[q]<T0+8){v2[q]=1;st.push(q)}}
   if(comp.length>W*H/4000)for(const k of comp){alfa[k]=Math.max(0,(d[k]-T0)/(T1-T0));
     // y su borde suave
     const x=k%W,y=(k/W)|0;for(const q of [k-1,k+1,k-W,k+W])if(q>=0&&q<W*H&&d[q]<T1&&!vis[q])alfa[q]=Math.min(alfa[q],Math.max(0,(d[q]-T0)/(T1-T0)))}}}
// suavizado leve del borde (promedio 3x3 solo donde el alfa no es 0 ni 1)
const a2=alfa.slice();
for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;if(alfa[k]===1&&alfa[k-1]===1&&alfa[k+1]===1&&alfa[k-W]===1&&alfa[k+W]===1)continue;
  let s=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)s+=alfa[k+dy*W+dx];a2[k]=Math.min(alfa[k],s/9+.08)}
// pedacitos sueltos (sombra del piso, ruido): se borra lo que tenga alfa < .35 en el tercio de abajo y no toque al cuerpo
// pedacitos sueltos: se deja solo la mancha más grande (el pudú)
{const et=new Int32Array(W*H).fill(-1);let mejor=-1,tamMejor=0,n=0;
 for(let k0=0;k0<W*H;k0++){if(et[k0]>=0||a2[k0]<.3)continue;let tam=0;const st=[k0];et[k0]=n;
   while(st.length){const k=st.pop();tam++;const x=k%W,y=(k/W)|0;
     for(const q of [x>0?k-1:-1,x<W-1?k+1:-1,y>0?k-W:-1,y<H-1?k+W:-1])if(q>=0&&et[q]<0&&a2[q]>=.3){et[q]=n;st.push(q)}}
   if(tam>tamMejor){tamMejor=tam;mejor=n}n++}
 // lo que no es parte del pudú (ni pegado a él) se borra
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x;if(et[k]>=0&&et[k]!==mejor)a2[k]=0}}
// 3) color: quitar el azul del fondo en los bordes
let x0=W,y0=H,x1=0,y1=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,i=k*4,a=a2[k];
  if(a<=0.12){p[i+3]=0;continue}
  // sin inflar el color de los casi transparentes (salían motas blancas)
  if(a<1)for(let c=0;c<3;c++){const f=fondo(x,y,c),ae=Math.max(a,.55);p[i+c]=Math.max(0,Math.min(255,(p[i+c]-(1-ae)*f)/ae))}
  p[i+3]=Math.round(a*255);
  if(a>.3){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
// 4) recorte con margen y escala opcional
const mg=6;x0=Math.max(0,x0-mg);y0=Math.max(0,y0-mg);x1=Math.min(W-1,x1+mg);y1=Math.min(H-1,y1+mg);
const w=x1-x0+1,h=y1-y0+1,esc=Math.min(1,(+anchoTxt||W)/W),ow=Math.round(w*esc),oh=Math.round(h*esc);
const out=new PNG({width:ow,height:oh});
for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){ // reducción por promedio de área (con alfa premultiplicado)
  const sx0=x0+x/esc,sy0=y0+y/esc,sx1=x0+(x+1)/esc,sy1=y0+(y+1)/esc;let r=0,g=0,b=0,a=0,n=0;
  for(let yy=Math.floor(sy0);yy<Math.ceil(sy1);yy++)for(let xx=Math.floor(sx0);xx<Math.ceil(sx1);xx++){const i=(yy*W+xx)*4,al=p[i+3]/255;r+=p[i]*al;g+=p[i+1]*al;b+=p[i+2]*al;a+=al;n++}
  const o=(y*ow+x)*4;out.data[o]=a?r/a:0;out.data[o+1]=a?g/a:0;out.data[o+2]=a?b/a:0;out.data[o+3]=Math.round(a/n*255)}
fs.writeFileSync(sal,PNG.sync.write(out));
console.log(sal.split(/[\\/]/).pop(),ow+'x'+oh,'recorte',x0,y0,w,h);
