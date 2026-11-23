/**
 * Local pixel-based appearance estimate for an OCR word or selected text region.
 * The source is the ORIGINAL rendered PDF canvas, never the preview overlay.
 * This estimates ink, background and approximate stroke weight. It cannot recover
 * the exact original font face or reconstruct a textured image background.
 */
const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
const hex=rgb=>'#'+rgb.map(c=>limit(Math.round(c),0,255).toString(16).padStart(2,'0')).join('');
const median=values=>{
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length/2)];
};
const medianRgb=samples=>[0,1,2].map(c=>median(samples.map(s=>s[c])));
const difference=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const luminance=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;

export function estimateTextStyle(image,region,original='') {
  const {width,height,data}=image||{};
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||
     !data||data.length<width*height*4)throw new Error('Özgün sayfa görüntüsü okunamadı.');
  const x0=limit(Math.floor(region.x0),0,width-1),x1=limit(Math.ceil(region.x1),x0+1,width);
  const y0=limit(Math.floor(region.y0),0,height-1),y1=limit(Math.ceil(region.y1),y0+1,height);
  const area=(x1-x0)*(y1-y0);
  const step=Math.max(1,Math.floor(Math.sqrt(Math.max(1,width*height)/150000)));
  const pixel=(x,y)=>{
    const offset=(y*width+x)*4;
    const alpha=data[offset+3]/255;
    return [
      Math.round(data[offset]*alpha+255*(1-alpha)),
      Math.round(data[offset+1]*alpha+255*(1-alpha)),
      Math.round(data[offset+2]*alpha+255*(1-alpha))
    ];
  };
  // The outside perimeter is more representative of the paper color than the
  // inside of a tight OCR word bounding box.
  const outside=[],inside=[];
  for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){
    const rgb=pixel(x,y);
    if(x>=x0&&x<x1&&y>=y0&&y<y1)inside.push(rgb);
    else outside.push(rgb);
  }
  const papers=outside.length?outside:inside;
  if(!papers.length)throw new Error('Yazı için örnek piksel bulunamadı.');
  // Quantized mode removes nearby strokes and JPEG grain from the background.
  const groups=new Map();
  for(const p of papers) {
    const key=p.map(channel=>Math.floor(channel/16)).join(',');
    const value=groups.get(key)||[];
    value.push(p);
    groups.set(key,value);
  }
  const largest=[...groups.values()].sort((a,b)=>b.length-a.length)[0];
  const background=medianRgb(largest);
  const paperDist=median(papers.map(p=>difference(p,background)));
  const threshold=Math.max(36,Math.min(80,paperDist*3+30));
  const candidates=inside.map(color=>({color,contrast:difference(color,background)}))
    .filter(p=>p.contrast>=threshold)
    .sort((a,b)=>b.contrast-a.contrast);
  // Keeping the darker/stronger core suppresses antialiasing halo pixels.
  const core=candidates.slice(0,Math.max(1,Math.ceil(candidates.length*.5))).map(p=>p.color);
  const sampledInk=core.length?medianRgb(core):
    (luminance(background)>140?[28,37,49]:[245,245,245]);
  const contrast=difference(sampledInk,background);
  const coverage=candidates.length/Math.max(1,inside.length);
  const reliability=inside.length>=12&&candidates.length>=3&&contrast>=46;
  const bgNoise=median(papers.map(p=>difference(p,background)));
  const confidence=reliability?
    limit(.15+.46*Math.min(1,contrast/170)+.25*Math.min(1,candidates.length/50)+
      .14*Math.min(1,largest.length/Math.max(1,papers.length)),0,1):0;
  // Bold inference is deliberately conservative: a small glyph or a logo can
  // have high coverage even with a thin font.
  const bold=reliability&&coverage>.37&&String(original).replace(/\s/g,'').length>=3;
  return {
    ink:hex(sampledInk),
    fill:hex(background),
    bold,
    confidence:Math.round(confidence*100)/100,
    texture: bgNoise>19 || largest.length/Math.max(1,papers.length)<.35,
    coverage:Math.round(coverage*100)/100
  };
}

/** Read a bounded crop from the unmodified rendered canvas. */
export function sampleCanvasTextStyle(canvas,box,original='') {
  if(!canvas||!box)throw new Error('Belge görüntüsü bulunamadı.');
  const pad=Math.round(limit(Math.max(4,(box.y1-box.y0)*.35),4,15));
  const left=limit(Math.floor(box.x0)-pad,0,canvas.width-1);
  const top=limit(Math.floor(box.y0)-pad,0,canvas.height-1);
  const right=limit(Math.ceil(box.x1)+pad,left+1,canvas.width);
  const bottom=limit(Math.ceil(box.y1)+pad,top+1,canvas.height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Görüntü pikselleri okunamadı.');
  const bitmap=ctx.getImageData(left,top,right-left,bottom-top);
  return estimateTextStyle(bitmap,{
    x0:box.x0-left,y0:box.y0-top,x1:box.x1-left,y1:box.y1-top
  },original);
}
