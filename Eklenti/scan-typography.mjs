import {combineSelectiveLayers,validateTransparentPatch,assertGlyphNotClipped} from './selective-repair.mjs';
import {planPaperRestoration} from './paper-restoration.mjs';
/** Scan-aware matching of a replacement to surrounding lettering.
 * All work is local and uses rendered PDF canvas pixels. A scanned original
 * does not contain a recoverable font name, so this remains an estimate.
 */
export const SCAN_FONTS=[
  {family:'OCRAnton',weight:400},
  {family:'OCROswald',weight:700},
  {family:'OCROswald',weight:400},
  {family:'OCRRobotoCondensed',weight:700},
  {family:'OCRRobotoCondensed',weight:400},
  {family:'OCRArchivoNarrow',weight:700},
  {family:'OCRArchivoNarrow',weight:400},
  {family:'NotoSansOcr',weight:700},
  {family:'NotoSansOcr',weight:400},
];
const bound=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const toRgb=h=>[1,3,5].map(i=>parseInt((/^#[a-f\d]{6}$/i.test(h||'')?h:'#ffffff').slice(i,i+2),16));

export function nearestSameLineWord(words,box){
  if(!Array.isArray(words)||!box)return null;
  const cy=(box.y0+box.y1)/2,h=box.y1-box.y0;
  return words.filter(w=>{
    const r=w?.bbox,t=String(w?.text||'').trim();
    if(!r||t.length<3||!/\p{L}/u.test(t))return false;
    const rc=(r.y0+r.y1)/2,rh=r.y1-r.y0;
    if(rh<6||Math.abs(rc-cy)>Math.max(5,h*.38))return false;
    if(rh<h*.66||rh>h*1.5)return false;
    if(!(r.x1<=box.x0-2||r.x0>=box.x1+2))return false;
    return true;
  }).map(w=>{
    const r=w.bbox,dx=Math.min(Math.abs(r.x1-box.x0),Math.abs(r.x0-box.x1));
    const score=dx+Math.abs((r.y1+r.y0)/2-cy)*3+
      Math.abs(Math.log((r.y1-r.y0)/h))*h*2-
      Math.min(20,w.text.trim().length*1.5);
    return {word:w,score};
  }).sort((a,b)=>a.score-b.score)[0]?.word||null;
}
/** Manual region selection must fully enclose every OCR word it includes.
 * Center-only selection silently treated HALF a word as completely selected.
 */
export function fullySelectedWords(words,box){
  if(!Array.isArray(words))return {sourceIndices:[],original:''};
  const hits=[];
  for(let index=0;index<words.length;index++){
    const item=words[index],r=item?.bbox;
    if(!r||!String(item.text||'').trim())continue;
    const cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;
    if(cx<box.x0||cx>box.x1||cy<box.y0||cy>box.y1)continue;
    const tolerance=1;
    if(r.x0<box.x0-tolerance||r.x1>box.x1+tolerance||
      r.y0<box.y0-tolerance||r.y1>box.y1+tolerance)
      throw new Error('"'+item.text+'" kelimesi seçim alanında yarım kalıyor. Sözcüğün tamamını kapsayan bir alan seç.');
    hits.push(index);
  }
  return {sourceIndices:hits,original:hits.map(i=>words[i].text).join(' ')};
}

/** Return adjacent OCR words which would be partly erased by the patch.
 * Manual region selection must contain the WHOLE recognized word, not just part.
 */
export function findUnselectedOverlap(words,box,sourceIndices=[],sourceIndex=null){
  const keep=new Set(sourceIndices.filter(Number.isInteger));
  if(Number.isInteger(sourceIndex))keep.add(sourceIndex);
  if(!Array.isArray(words))return [];
  return words.flatMap((w,index)=>{
    if(keep.has(index)||!w?.bbox||!String(w.text||'').trim())return [];
    const r=w.bbox;
    const x=Math.max(0,Math.min(box.x1,r.x1)-Math.max(box.x0,r.x0));
    const y=Math.max(0,Math.min(box.y1,r.y1)-Math.max(box.y0,r.y0));
    const area=Math.max(1,(r.x1-r.x0)*(r.y1-r.y0));
    const overlap=x*y/area;
    // Tiny OCR geometry overlaps are normal. A substantial crop is not.
    return overlap>.13&&x>2&&y>2?[{index,word:String(w.text),overlap}]:[];
  });
}

function glyphMetrics(ctx,word,family,weight,size){
  ctx.font=weight+' '+size+'px "'+family+'"';
  const m=ctx.measureText(word);
  const asc=Math.max(1,m.actualBoundingBoxAscent||size*.73);
  const desc=Math.max(0,m.actualBoundingBoxDescent||0);
  const w=Math.max(1,(m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||m.width));
  return {size,asc,desc,w,left:m.actualBoundingBoxLeft||0};
}
function fontSettings(ctx,word,family,weight,targetH){
  const first=glyphMetrics(ctx,word,family,weight,100);
  const size=bound(100*targetH/(first.asc+first.desc),5,220);
  return glyphMetrics(ctx,word,family,weight,size);
}
function targetMask(canvas,box,background,ink){
  const x0=bound(Math.floor(box.x0),0,canvas.width-1);
  const y0=bound(Math.floor(box.y0),0,canvas.height-1);
  const width=bound(Math.ceil(box.x1)-x0,1,canvas.width-x0);
  const height=bound(Math.ceil(box.y1)-y0,1,canvas.height-y0);
  const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(x0,y0,width,height).data;
  const contrast=Math.max(30,dist(background,ink)*.23);
  const mask=new Uint8Array(width*height);
  let count=0;
  for(let k=0;k<mask.length;k++){
    const i=k*4;
    if(dist([data[i],data[i+1],data[i+2]],background)>contrast){
      mask[k]=1;count++;
    }
  }
  return {mask,count,width,height};
}
/** Compare candidate glyph silhouettes against a SAME-LINE reference word.
 * The result is meaningful only if matching fonts are bundled; never claim exact identity.
 */
export function matchScanFont(canvas,reference,inkHex,fillHex){
  if(!canvas||!reference?.bbox||!reference.text?.trim())return null;
  const box=reference.bbox,rawW=box.x1-box.x0,rawH=box.y1-box.y0;
  if(rawW<12||rawH<8||rawW>1500||rawH>300)return null;
  const bg=toRgb(fillHex),ink=toRgb(inkHex);
  const actual=targetMask(canvas,box,bg,ink);
  if(actual.count<5)return null;
  const scratch=document.createElement('canvas');
  const ctx=scratch.getContext('2d',{willReadFrequently:true});
  if(!ctx)return null;
  scratch.width=actual.width;scratch.height=actual.height;
  let best=null;
  for(const {family,weight} of SCAN_FONTS){
    // Text is estimated from real ink height, NOT shrunken to text box width.
    const m=fontSettings(ctx,reference.text,family,weight,rawH*.94);
    const fitX=rawW/m.w;
    // Reject candidates requiring grotesque horizontal stretching/squeezing.
    // The prior 0.43 allowance caused thin, extremely tall headings.
    if(fitX<.82||fitX>1.22)continue;
    ctx.clearRect(0,0,scratch.width,scratch.height);
    ctx.save();
    ctx.fillStyle='#000';
    const dx=m.left*fitX;
    const dy=Math.max(0,(scratch.height-(m.asc+m.desc))/2);
    ctx.translate(dx,m.asc+dy);
    ctx.scale(fitX,1);
    ctx.font=weight+' '+m.size+'px "'+family+'"';
    ctx.fillText(reference.text,0,0);
    ctx.restore();
    const pixels=ctx.getImageData(0,0,scratch.width,scratch.height).data;
    let mismatch=0,predCount=0;
    for(let i=0;i<actual.mask.length;i++){
      const value=pixels[i*4+3]>105?1:0;
      predCount+=value;
      mismatch+=value!==actual.mask[i]?1:0;
    }
    const score=mismatch/Math.max(1,actual.count+predCount)+
      .28*Math.abs(Math.log(fitX))+
      .08*Math.abs(Math.log((m.asc+m.desc)/rawH));
    if(!best||score<best.score)best={
      family,weight,scaleX:fitX,fontSize:m.size,score,
      refHeight:rawH,referenceText:reference.text
    };
  }
  // A score too high is not a trustworthy font match; return the safe fallback.
  return best&&best.score<=.48?best:null;
}
/** Prefer a same-line word so the resulting size/weight matches the line.
 * Fallback to the original word when OCR cannot find a neighbor.
 */
export function analyzeScanTypography(canvas,words,box,original,style){
  const word=nearestSameLineWord(words,box)||
    (String(original||'').trim().length>=3?{text:original,bbox:box}:null);
  const matched=matchScanFont(canvas,word,style.ink,style.fill);
  return matched||{
    family:'NotoSansOcr',weight:style.bold?700:400,scaleX:1,
    fontSize:Math.max(9,(box.y1-box.y0)*1.12),
    score:1,refHeight:box.y1-box.y0,referenceText:String(original||'')
  };
}
export function layoutScanReplacement(measure,edit,typography){
  const box=edit.box,width=box.x1-box.x0,height=box.y1-box.y0;
  if(width<5||height<4)throw new Error('Yazı alanı çok küçük.');
  const lines=String(edit.text||'').split('\n');
  // OCR boxes are expanded for safe paper sampling. The font MUST retain the
  // original ink height, not scale up because of the added blank crop margin.
  const referenceHeight=Number(typography.targetHeight)||height;
  const targetFont=bound(typography.fontSize*referenceHeight/Math.max(1,typography.refHeight),5,200);
  const settings=glyphMetrics(measure,lines.reduce((a,b)=>a.length>=b.length?a:b,''),typography.family,typography.weight,targetFont);
  const border=Math.min(2,Math.max(.3,height*.025));
  const maxWidth=width-border*2;
  const rawWidthRatio=maxWidth/Math.max(1,settings.w);
  // Refuse destructive compression. A tiny, tall, narrow word is worse than
  // a clear warning; users can enlarge the selected region instead.
  const scaleX=Math.min(bound(typography.scaleX,.84,1.16),rawWidthRatio);
  if(scaleX<.84)throw new Error('Yeni yazı özgün yazı kalınlığında bu alana sığmıyor. Daha geniş bir alan işaretle.');
  const lineH=targetFont*1.12;
  const textH=lines.length===1?settings.asc+settings.desc:
    (lines.length-1)*lineH+settings.asc+settings.desc;
  if(textH>height*1.15)throw new Error('Metin bu satır yüksekliğine sığmıyor. Daha geniş bir alan seç.');
  return {
    family:typography.family,weight:typography.weight,
    fontSize:targetFont,scaleX,
    baseline:bound((height-textH)/2+settings.asc,border+settings.asc,height-border-settings.desc),
    lineHeight:lineH,lines,
    ink:edit.ink,fill:edit.fill
  };
}
/**
 * Repair only the old glyph pixels and overlay the newly chosen text, leaving
 * ALL other original pixels transparent/untouched. PNG alpha survives pdf-lib.
 * On uncertainty this throws and the viewer keeps the original document.
 */
export function renderScanReplacement(canvas,edit,typography){
  if(!canvas)throw new Error('Orijinal görüntü bulunamadı.');
  const box=edit.box,x0=Math.floor(box.x0),y0=Math.floor(box.y0);
  const x1=Math.ceil(box.x1),y1=Math.ceil(box.y1),w=x1-x0,h=y1-y0;
  if(x0<0||y0<0||x1>canvas.width||y1>canvas.height||
    w<8||h<7||w*h>1_200_000)
    throw new Error('Düzenleme alanı sayfa sınırları dışında veya çok büyük.');
  const source=canvas.getContext('2d',{willReadFrequently:true});
  if(!source)throw new Error('Orijinal görüntü okunamadı.');
  const selectedPixels=source.getImageData(x0,y0,w,h);
  // Replace the ENTIRE old text crop (only on verified clean paper),
  // including antialiased outlines and JPEG haloes. Previous sparse masking
  // left the old lettering visible under the replacement.
  const cleanup=planPaperRestoration(selectedPixels,{ink:edit.ink,fill:edit.fill});
  const glyph=document.createElement('canvas');
  glyph.width=w;glyph.height=h;
  const gc=glyph.getContext('2d',{willReadFrequently:true});
  if(!gc)throw new Error('Yazı çizilemedi.');
  const layout=layoutScanReplacement(gc,edit,typography);
  gc.save();
  gc.translate(Math.max(.3,h*.025),layout.baseline);
  gc.scale(layout.scaleX,1);
  gc.font=layout.weight+' '+layout.fontSize+'px "'+layout.family+'"';
  gc.fillStyle='#000000';
  for(let i=0;i<layout.lines.length;i++)
    gc.fillText(layout.lines[i],0,i*layout.lineHeight);
  gc.restore();
  const glyphPixels=gc.getImageData(0,0,w,h).data;
  // Explicitly fail if no new text landed inside the patch.
  if(!glyphPixels.some((value,index)=>index%4===3&&value>20))
    throw new Error('Yeni yazı seçilen alanda çizilemedi; orijinal görüntü korundu.');
  assertGlyphNotClipped(glyphPixels,w,h);
  const result=combineSelectiveLayers(cleanup,glyphPixels,edit.ink);
  validateTransparentPatch(result,cleanup,glyphPixels);
  const output=document.createElement('canvas');
  output.width=w;output.height=h;
  const out=output.getContext('2d');
  if(!out)throw new Error('Görüntü yaması oluşturulamadı.');
  const image=out.createImageData(w,h);
  image.data.set(result.data);
  out.putImageData(image,0,0);
  return {png:output.toDataURL('image/png'),layout,
    repairedPixels:cleanup.oldGlyphPixels,
    transparency:'bounded-restoration',confidence:cleanup.sourceUniformity};
}
