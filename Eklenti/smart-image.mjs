/** Region-only image preprocessing. Only OCR candidates are changed;
 * the document's visual layer and saved source are never modified.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const luminance=(r,g,b)=>r*.2126+g*.7152+b*.0722;
export function preprocessRegionPixels(image,mode='contrast'){
  const {width,height,data}=image||{};
  if(!data||data.length!==width*height*4)throw new Error('Bölge görüntüsü geçersiz.');
  const out=new Uint8ClampedArray(data);
  if(mode==='original')return {width,height,data:out};
  let low=255,high=0;const hist=new Uint32Array(256);
  for(let k=0;k<out.length;k+=4){
    const v=Math.round(luminance(out[k],out[k+1],out[k+2]));
    hist[v]++;
  }
  const quantile=f=>{
    let n=0,total=width*height;
    for(let i=0;i<256;i++){n+=hist[i];if(n>=total*f)return i;}
    return 255;
  };
  low=quantile(.025);high=quantile(.975);
  const gain=high-low>=35?Math.min(1.50,226/(high-low)):1;
  for(let k=0;k<out.length;k+=4){
    const r=out[k],g=out[k+1],b=out[k+2],
      gray=luminance(r,g,b);
    const contrast=clamp((gray-low)*gain+11,0,255);
    if(mode==='blue-pen'){
      // Saturated dark blue strokes are retained; pale blue watermark/print
      // is gently suppressed. Applies to OCR image ONLY.
      const blue=(b-r>24&&b-g>6&&gray<218);
      const strength=clamp((b-r-20)/75,0,1);
      const ink=blue?clamp(gray-70*strength,0,190):255;
      out[k]=out[k+1]=out[k+2]=ink;
    }else if(mode==='stamp'){
      // Ink stamps are usually dark. Eliminate pale colored backgrounds.
      const dark=gray<178?clamp((gray-28)*1.5,0,255):255;
      out[k]=out[k+1]=out[k+2]=dark;
    }else if(mode==='paper'){
      // Pale watermark treated as near-white for reading dark overprinted text.
      const paleBlue=b>r+10&&r>130&&g>140;
      const value=paleBlue?255:contrast;
      out[k]=out[k+1]=out[k+2]=value;
    }else{
      out[k]=out[k+1]=out[k+2]=contrast;
    }
    out[k+3]=255;
  }
  return {width,height,data:out};
}
export function safeAnalysisScale(box,{factor=2.5,maxPixels=3_200_000,maxDimension=2800}={}){
  const w=box.x1-box.x0,h=box.y1-box.y0;
  if(w<1||h<1)throw new Error('Analiz alanı boş.');
  return Math.max(1,Math.min(factor,Math.sqrt(maxPixels/(w*h)),maxDimension/w,maxDimension/h));
}
export function regionBitmapFromCanvas(canvas,box){
  const x=Math.floor(box.x0),y=Math.floor(box.y0);
  const width=Math.ceil(box.x1)-x,height=Math.ceil(box.y1)-y;
  if(x<0||y<0||x+width>canvas.width||y+height>canvas.height)
    throw new Error('Bölge sayfa dışında.');
  return canvas.getContext('2d',{willReadFrequently:true}).getImageData(x,y,width,height);
}
export function canvasFromPixels(bitmap){
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Görüntü işlenemedi.');
  const image=ctx.createImageData(bitmap.width,bitmap.height);
  image.data.set(bitmap.data);
  ctx.putImageData(image,0,0);
  return canvas;
}
export function rotateRegion(canvas,degrees){
  if(!degrees)return canvas;
  const rad=degrees*Math.PI/180;
  const w=canvas.width,h=canvas.height;
  const output=document.createElement('canvas');
  output.width=Math.max(1,Math.ceil(Math.abs(w*Math.cos(rad))+Math.abs(h*Math.sin(rad))));
  output.height=Math.max(1,Math.ceil(Math.abs(h*Math.cos(rad))+Math.abs(w*Math.sin(rad))));
  const ctx=output.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,output.width,output.height);
  ctx.translate(output.width/2,output.height/2);
  ctx.rotate(rad);
  ctx.drawImage(canvas,-w/2,-h/2);
  return output;
}
export async function highResolutionRegion(view,box,{factor=2.6}={}){
  if(!view?.page||!view?.viewport||!view?.canvas)throw new Error('Sayfa görüntüsü henüz hazır değil.');
  const scaled=safeAnalysisScale(box,{factor});
  const ratio=scaled,viewport=view.page.getViewport({
    scale:view.viewport.scale*ratio,rotation:view.page.rotate+view.rotation
  });
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil((box.x1-box.x0)*ratio);
  canvas.height=Math.ceil((box.y1-box.y0)*ratio);
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  // PDF.js renders at target scale and translates only selected region into
  // bounded output canvas, not a huge full-page bitmap.
  await view.page.render({
    canvasContext:ctx,viewport,
    transform:[1,0,0,1,-box.x0*ratio,-box.y0*ratio]
  }).promise;
  return {canvas,ratio,box};
}
/** Approximate circular-seal ring unwrapping. Never guarantees curved text
 * recognition: multiple angles are returned to compare, not one made-up text.
 */
export function unwrapCircularStamp(source, {band=.31}={}){
  const canvas=source,side=Math.min(canvas.width,canvas.height);
  if(side<40)throw new Error('Kaşe bölgesi çok küçük.');
  const cx=canvas.width/2,cy=canvas.height/2;
  const rMin=side*.29,rMax=side*.48;
  const outer=Math.max(2,Math.round((rMax-rMin)*2));
  const width=Math.min(1600,Math.max(360,Math.round(2*Math.PI*side*.42)));
  const height=Math.min(240,outer);
  const result=document.createElement('canvas');result.width=width;result.height=height;
  const data=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);
  const ctx=result.getContext('2d',{willReadFrequently:true});
  const out=ctx.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const angle=(x/width)*2*Math.PI-Math.PI/2;
    const radius=rMin+(y/Math.max(1,height-1))*(rMax-rMin);
    const sx=Math.round(cx+radius*Math.cos(angle));
    const sy=Math.round(cy+radius*Math.sin(angle));
    const j=(y*width+x)*4;
    if(sx<0||sy<0||sx>=canvas.width||sy>=canvas.height){
      out.data[j]=out.data[j+1]=out.data[j+2]=255;out.data[j+3]=255;continue;
    }
    const i=(sy*canvas.width+sx)*4;
    for(let c=0;c<4;c++)out.data[j+c]=data.data[i+c];
  }
  ctx.putImageData(out,0,0);
  return result;
}
