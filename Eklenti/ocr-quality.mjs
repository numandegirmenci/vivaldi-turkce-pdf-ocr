/** Adaptive, higher-resolution render for OCR, independent from on-screen zoom. */
export function calculateOcrScale(viewportAtOne, {maxPixels=10000000,maxScale=4}={}){
  const width=Number(viewportAtOne?.width),height=Number(viewportAtOne?.height);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('OCR sayfa boyutu geçersiz.');
  return Math.min(maxScale,Math.sqrt(maxPixels/(width*height)),8192/width,8192/height);
}
export function remapOcrWords(words,sx,sy){
  return words.map(w=>({...w,bbox:{x0:w.bbox.x0*sx,x1:w.bbox.x1*sx,y0:w.bbox.y0*sy,y1:w.bbox.y1*sy}}));
}

/** PDF.js renders the original pixels at OCR resolution; no fake upscaling. */
export async function prepareOcrSurface(view,enhanced=false){
  if(!view?.page||!view.canvas)throw new Error('OCR görüntüsü hazır değil.');
  const raw=view.page.getViewport({scale:1,rotation:view.page.rotate+view.rotation});
  const targetScale=calculateOcrScale(raw);
  const target=view.page.getViewport({scale:targetScale,rotation:view.page.rotate+view.rotation});
  if(target.width<=view.canvas.width*1.04){
    return {canvas:enhanced?adjustContrast(view.canvas):view.canvas,
      scaleX:1,scaleY:1,dispose(){if(this.canvas!==view.canvas){this.canvas.width=0;this.canvas.height=0;}}};
  }
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.ceil(target.width));canvas.height=Math.max(1,Math.ceil(target.height));
  try{
    const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:enhanced});
    if(!ctx)throw new Error('OCR görseli oluşturulamadı.');
    await view.page.render({canvasContext:ctx,viewport:target}).promise;
    const final=enhanced?adjustContrast(canvas):canvas;
    if(final!==canvas){canvas.width=0;canvas.height=0;}
    return {canvas:final,scaleX:view.canvas.width/Math.max(1,Math.ceil(target.width)),
      scaleY:view.canvas.height/Math.max(1,Math.ceil(target.height)),
      dispose(){final.width=0;final.height=0;}};
  }catch(error){canvas.width=0;canvas.height=0;throw error;}
}

/** Mild contrast stretching: preserve thin table borders and dots on Turkish letters. */
function adjustContrast(source){
  const target=document.createElement('canvas');target.width=source.width;target.height=source.height;
  const ctx=target.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const image=ctx.getImageData(0,0,target.width,target.height),data=image.data;
  const histogram=new Uint32Array(256);let count=0;
  for(let i=0;i<data.length;i+=16){
    const g=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);histogram[g]++;count++;
  }
  const percentile=(fraction)=>{let seen=0;for(let i=0;i<256;i++){seen+=histogram[i];if(seen>=count*fraction)return i;}return 255;};
  const low=percentile(.02),high=percentile(.98);
  const range=high-low;
  if(range<30)return target;
  const factor=Math.min(1.35,235/range),offset=low-(255/factor-range)/2;
  for(let i=0;i<data.length;i+=4){
    const g=.299*data[i]+.587*data[i+1]+.114*data[i+2];
    const value=Math.max(0,Math.min(255,(g-offset)*factor));
    data[i]=data[i+1]=data[i+2]=value;
  }
  ctx.putImageData(image,0,0);return target;
}
