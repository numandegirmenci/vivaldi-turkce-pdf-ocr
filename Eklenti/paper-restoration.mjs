import {estimatePaper} from './selective-repair.mjs';

/**
 * Ghost-free, bounded scanned-text cleanup on flat paper.
 *
 * The old selective ink mask was incomplete on antialiasing/JPEG artifacts,
 * leaving visible letter outlines under replacement text. For verified
 * homogeneous paper this replaces the ENTIRE text crop with reconstructed
 * background and feathers only clean margins. It NEVER changes pixels outside
 * the crop and refuses patterns, stamps, borders or ink touching its edges.
 *
 * This is conservative image restoration, not AI inpainting/redaction.
 */
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const color=(image,p)=>[image[p*4],image[p*4+1],image[p*4+2]];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const median=xs=>{
  if(!xs.length)return 0;
  const s=[...xs].sort((a,b)=>a-b);
  return s[Math.floor(s.length/2)];
};
function medianColor(colors,fallback){
  const items=colors.filter(Boolean);
  return items.length?[0,1,2].map(k=>median(items.map(c=>c[k]))):fallback;
}
function smooth(t){const x=clip(t,0,1);return x*x*(3-2*x);}

/** Transparent patch removes ALL old letters within a validated word box. */
export function planPaperRestoration(image,{ink='#202020',fill='#ffffff'}={}){
  const {width:w,height:h,data}=image||{};
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<12||h<12||
     !data||data.length!==w*h*4)
    throw new Error('Metin düzeltme görüntüsü geçersiz.');
  if(w*h>1_200_000)throw new Error('Metin düzeltme alanı çok büyük.');
  const base=estimatePaper(image,fill),paper=base.color;
  if(base.uniformity<.81)
    throw new Error('Arka plan desenli veya başka grafik içeriyor. Eski harfleri iz bırakmadan silmek için temiz bir alan seç.');
  const gap=Math.max(2,Math.min(5,Math.floor(Math.min(w,h)*.08)));
  const edgeLimit=36;
  let inkNearBorder=0,edgeTotal=0;
  const borderSamples=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const d=Math.min(x,y,w-1-x,h-1-y);
    if(d>=gap)continue;
    const p=color(data,y*w+x);
    edgeTotal++;
    const contrast=dist(p,paper);
    if(contrast>edgeLimit)inkNearBorder++;
    else borderSamples.push(p);
  }
  if(inkNearBorder>Math.max(3,Math.round(edgeTotal*.012)))
    throw new Error('Seçim kenarında eski harf veya komşu yazı var. İz bırakmadan onarmak için daha geniş alan seç.');
  if(borderSamples.length<Math.max(30,edgeTotal*.75))
    throw new Error('Metnin çevresindeki temiz kağıt dokusu bulunamadı.');
  const sampledPaper=medianColor(borderSamples,paper);
  const deviations=borderSamples.map(p=>dist(p,sampledPaper));
  const paperNoise=median(deviations);
  if(paperNoise>15)
    throw new Error('Zemin dokusu çok değişken. İz bırakmadan düzenleme bu alanda desteklenmiyor.');
  // Estimate per-column paper tone from the top/bottom clean bands. Any
  // original dark glyph samples are ignored entirely, not averaged.
  const top=[],bottom=[];
  for(let x=0;x<w;x++){
    const ts=[],bs=[];
    for(let y=0;y<gap;y++){
      const c=color(data,y*w+x);
      if(dist(c,sampledPaper)<edgeLimit)ts.push(c);
      const b=color(data,(h-1-y)*w+x);
      if(dist(b,sampledPaper)<edgeLimit)bs.push(b);
    }
    top[x]=medianColor(ts,sampledPaper);
    bottom[x]=medianColor(bs,sampledPaper);
  }
  // Source must contain real ink, otherwise an accidental click erases paper.
  let darkPixels=0;
  for(let y=gap;y<h-gap;y++)for(let x=gap;x<w-gap;x++){
    if(dist(color(data,y*w+x),sampledPaper)>58)darkPixels++;
  }
  const ratio=darkPixels/Math.max(1,(w-2*gap)*(h-2*gap));
  if(ratio<.006||ratio>.52)
    throw new Error('Eski yazı güvenilir biçimde ayrıştırılamadı. Orijinal sayfa korundu.');
  const restored=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=(y*w+x)*4,vertical=(y+.5)/h;
    const margin=Math.min(x,y,w-1-x,h-1-y);
    // By the time cleanup becomes opaque, old ink is forbidden near any edge.
    const opacity=smooth(margin/gap);
    const t=vertical*vertical*(3-2*vertical);
    const c=top[x],b=bottom[x];
    for(let ch=0;ch<3;ch++){
      const interpolated=c[ch]*(1-t)+b[ch]*t;
      // Clamp reconstructed tone to real paper to avoid horizontal streaks.
      restored[k+ch]=clip(Math.round(
        sampledPaper[ch]*.32+interpolated*.68),0,255);
    }
    restored[k+3]=Math.round(255*opacity);
  }
  return {
    width:w,height:h,data:restored,oldGlyphPixels:darkPixels,
    coverage:ratio,sourceUniformity:base.uniformity,
    paper:sampledPaper,method:'bounded-paper-restoration',
    borderInkCount:inkNearBorder
  };
}

/** Simulate how a PNG cleanup will overlay original scan pixels. */
export function compositeCleanup(original,cleanup){
  if(original.width!==cleanup.width||original.height!==cleanup.height)
    throw new Error('Onarım boyutu özgün görüntüyle uyuşmuyor.');
  const data=new Uint8ClampedArray(original.data);
  for(let i=0;i<data.length;i+=4){
    const a=cleanup.data[i+3]/255;
    for(let ch=0;ch<3;ch++)
      data[i+ch]=Math.round(cleanup.data[i+ch]*a+original.data[i+ch]*(1-a));
    data[i+3]=255;
  }
  return {width:original.width,height:original.height,data};
}
