/* Copias livianas de los PNG transparentes para el mockup (en pantalla se dibujan a ~92 px de alto,
   así que la mitad del tamaño basta y la página no pasa del límite de 16 MB con los 6 animales).
   Promedia por área con el alfa premultiplicado, para que los bordes del pelaje no se oscurezcan.
   Uso: NODE_PATH=<carpeta>/node_modules node achicar.js <factor> <archivo.png>...   (salida en transparentes/mockup/) */
const fs=require('fs'),path=require('path'),{PNG}=require('pngjs');
const [,,factorTxt,...archivos]=process.argv, f=+factorTxt||.5;
const dir=path.join(path.dirname(archivos[0]),'mockup');fs.mkdirSync(dir,{recursive:true});
for(const a of archivos){
  const im=PNG.sync.read(fs.readFileSync(a)),W=im.width,H=im.height,ow=Math.max(1,Math.round(W*f)),oh=Math.max(1,Math.round(H*f));
  const o=new PNG({width:ow,height:oh});
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
    let r=0,g=0,b=0,al=0,n=0;
    for(let yy=Math.floor(y/f);yy<Math.min(H,Math.ceil((y+1)/f));yy++)for(let xx=Math.floor(x/f);xx<Math.min(W,Math.ceil((x+1)/f));xx++){
      const i=(yy*W+xx)*4,aa=im.data[i+3]/255;r+=im.data[i]*aa;g+=im.data[i+1]*aa;b+=im.data[i+2]*aa;al+=aa;n++}
    const i=(y*ow+x)*4;o.data[i]=al?r/al:0;o.data[i+1]=al?g/al:0;o.data[i+2]=al?b/al:0;o.data[i+3]=Math.round(al/n*255)}
  fs.writeFileSync(path.join(dir,path.basename(a)),PNG.sync.write(o));
}
console.log(archivos.length+' copias en '+dir);
