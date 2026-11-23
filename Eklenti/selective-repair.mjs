/**
 * Conservative, pixel-selective text repair.
 *
 * Unlike an opaque rectangle, this engine creates a TRANSPARENT PNG layer:
 * - only detected original glyph pixels are cleaned
 * - newly drawn glyph pixels are added
 * - every other pixel stays transparent and the original PDF remains untouched.
 * It refuses regions where the foreground cannot reliably be distinguished.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=values=>{
  const a=[...values].sort((x,y)=>x-y);
  return a[Math.floor(a.length/2)]??0;
};
const rgb=hex=>[1,3,5].map(i=>parseInt((/^#[\da-f]{6}$/i.test(hex||'')?hex:'#ffffff').slice(i,i+2),16));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const brightness=col=>col[0]*.2126+col[1]*.7152+col[2]*.0722;
const componentMedian=colors=>[0,1,2].map(i=>median(colors.map(v=>v[i])));
const colorAt=(pixels,index)=>[pixels[index*4],pixels[index*4+1],pixels[index*4+2]];

/** Strongly prefer the dominant border/background color over a guessed fill. */
export function estimatePaper(image,claimedFill='#ffffff'){
  const {width:w,height:h,data}=image||{};
  if(!(w>=8&&h>=7&&data?.length>=w*h*4))throw new Error('Kırpılan görüntü geçersiz.');
  const band=clamp(Math.floor(Math.min(w,h)*.075),2,6);
  const samples=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(y<band||y>=h-band||x<band||x>=w-band)
      samples.push(colorAt(data,y*w+x));
  }
  // Find the most common scanner-paper tone, not a random dark pixel/colored logo.
  const bins=new Map();
  for(const color of samples){
    const key=color.map(c=>Math.floor(c/16)).join(',');
    const group=bins.get(key)||[];group.push(color);bins.set(key,group);
  }
  const ordered=[...bins.values()].sort((a,b)=>b.length-a.length);
  const winner=ordered[0]||[];
  const sampled=componentMedian(winner);
  const fallback=rgb(claimedFill);
  const quality=winner.length/Math.max(1,samples.length);
  const background=quality>.28?sampled:fallback;
  const deviations=samples.map(p=>distance(p,background));
  const clean=deviations.filter(d=>d<45).length/Math.max(1,samples.length);
  return {color:background,uniformity:clean,confidence:quality};
}

/** Image must be the ORIGINAL cropped page pixels, not a previously edited patch.
 * Return an RGBA cleanup layer where untouched pixels have alpha zero.
 */
export function planSelectiveRemoval(image,{ink='#111111',fill='#ffffff'}={}){
  const {width:w,height:h,data}=image||{};
  if(!(Number.isInteger(w)&&Number.isInteger(h)&&w>=8&&h>=7&&data?.length>=w*h*4))
    throw new Error('Görsel bölgesi okunamadı.');
  if(w*h>1_200_000)throw new Error('Seçilen alan çok büyük.');
  const paper=estimatePaper(image,fill),background=paper.color,inkRgb=rgb(ink);
  const contrast=distance(background,inkRgb);
  if(paper.uniformity<.65)
    throw new Error('Seçilen alanda desen veya başka yazı olabilir. Güvenli onarım için daha küçük ve temiz bir alan seç.');
  if(contrast<64)
    throw new Error('Yazı ile zemin arasındaki fark güvenle ayırt edilemiyor; orijinal görüntü korundu.');
  const threshold=Math.max(29,contrast*.22);
  const core=new Uint8Array(w*h);
  let covered=0;
  const direction=brightness(inkRgb)<brightness(background)?-1:1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=y*w+x,k=p*4,c=colorAt(data,p);
    const spread=distance(c,background);
    const related=distance(c,inkRgb)<spread*1.18;
    const signed=(brightness(c)-brightness(background))*direction;
    if(spread>threshold&&related&&signed>17){
      core[p]=255;covered++;
    }
  }
  const ratio=covered/(w*h);
  if(ratio<.007||ratio>.60)
    throw new Error('Orijinal harfler güvenilir biçimde ayrıştırılamadı. Bu alanda görüntüye müdahale edilmedi.');
  // If old ink touches the crop boundary, replacing it would cut off adjacent glyphs.
  let edgeCount=0;
  for(let x=0;x<w;x++){edgeCount+=core[x]===255?1:0;edgeCount+=core[(h-1)*w+x]===255?1:0;}
  for(let y=1;y<h-1;y++){edgeCount+=core[y*w]===255?1:0;edgeCount+=core[y*w+w-1]===255?1:0;}
  if(edgeCount>Math.max(2,Math.round((w+h)*.012)))
    throw new Error('Harfler seçili alanın kenarına taşıyor. Komşu yazıyı korumak için alanı biraz genişlet.');
  const alpha=new Uint8ClampedArray(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=y*w+x;
    if(core[p]){alpha[p]=255;continue;}
    // Clean soft anti-aliasing halos around original ink, never across the box edge.
    if(x<1||y<1||x>=w-1||y>=h-1)continue;
    const neighbors=core[p-1]||core[p+1]||core[p-w]||core[p+w];
    if(neighbors&&distance(colorAt(data,p),background)>10)alpha[p]=155;
  }
  const cleanup=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=y*w+x,base=p*4;
    if(!alpha[p])continue;
    // Scanner paper grain is estimated only from real clean border pixels.
    const above=colorAt(data,x),below=colorAt(data,(h-1)*w+x);
    for(let c=0;c<3;c++){
      const top=Math.abs(above[c]-background[c])<28?above[c]:background[c];
      const bot=Math.abs(below[c]-background[c])<28?below[c]:background[c];
      cleanup[base+c]=Math.round(background[c]*.65+(top+bot)*.175);
    }
    cleanup[base+3]=alpha[p];
  }
  return {width:w,height:h,data:cleanup,inkRgb,background,oldGlyphPixels:covered,
    coverage:ratio,sourceUniformity:paper.uniformity};
}

/** Compose cleanup and NEW glyph alpha onto a transparent (not opaque) patch. */
export function combineSelectiveLayers(cleanup,glyphPixels,inkHex='#111111'){
  const {width:w,height:h,data:paper}=cleanup||{};
  if(!(w>0&&h>0&&paper?.length===w*h*4&&glyphPixels?.length===w*h*4))
    throw new Error('Düzenleme katmanlarının boyutları uyumsuz.');
  const ink=rgb(inkHex),out=new Uint8ClampedArray(w*h*4);
  for(let k=0;k<out.length;k+=4){
    const remove=paper[k+3]/255,write=glyphPixels[k+3]/255;
    const a=write+remove*(1-write);
    if(!a)continue;
    for(let c=0;c<3;c++)
      out[k+c]=Math.round((ink[c]*write+paper[k+c]*remove*(1-write))/a);
    out[k+3]=Math.round(a*255);
  }
  return {width:w,height:h,data:out};
}
/** Prevent a replacement from visually cutting off its own letters at the crop edges. */
export function assertGlyphNotClipped(glyphPixels,width,height){
  if(!glyphPixels||glyphPixels.length!==width*height*4)
    throw new Error('Yeni yazı görüntüsü okunamadı.');
  let hits=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(x>1&&x<width-2&&y>1&&y<height-2)continue;
    if(glyphPixels[(y*width+x)*4+3]>50)hits++;
  }
  if(hits>2)throw new Error('Yeni yazının harfleri seçili alanın dışında kesiliyor. Daha geniş alan seç.');
  return true;
}

/** Precisely confirm that pixels outside both change masks remain transparent. */
export function validateTransparentPatch(patch,cleanup,glyphPixels){
  for(let k=3;k<patch.data.length;k+=4){
    if(!cleanup.data[k]&&!glyphPixels[k]&&patch.data[k])
      throw new Error('Düzenleme alanı dışında beklenmeyen piksel değişikliği.');
  }
  return true;
}
