/**
 * Local document-region hints. These are HEURISTICS, not a trained
 * layout/handwriting detector. Every guess is marked uncertain in the UI.
 * Runs on the original, unmodified page pixels.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const REGION_LABELS={
  print:'Basılı metin', handwriting:'El yazısı',stamp:'Kaşe / mühür',
  signature:'İmza / çizim',uncertain:'İncelenecek bölge'
};
export function normalizeRegion(box,width,height){
  if(!box||![box.x0,box.y0,box.x1,box.y1,width,height].every(Number.isFinite))
    throw new Error('Bölge koordinatları geçersiz.');
  const x0=clamp(Math.floor(Math.min(box.x0,box.x1)),0,width-1);
  const y0=clamp(Math.floor(Math.min(box.y0,box.y1)),0,height-1);
  const x1=clamp(Math.ceil(Math.max(box.x0,box.x1)),x0+1,width);
  const y1=clamp(Math.ceil(Math.max(box.y0,box.y1)),y0+1,height);
  if(x1-x0<9||y1-y0<7)throw new Error('Bölge çok küçük.');
  return {x0,y0,x1,y1};
}
const area=r=>Math.max(1,r.x1-r.x0)*Math.max(1,r.y1-r.y0);
const intersect=(a,b)=>{
  const w=Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0));
  const h=Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0));
  return w*h;
};
export function wordOverlap(words,box){
  return (words||[]).filter(w=>w?.bbox&&intersect(box,w.bbox)/area(w.bbox)>.35);
}
const confidence=w=>{
  const n=Number(w?.confidence);
  return Number.isFinite(n)?clamp(n,0,100):null;
};
const luma=(r,g,b)=>.2126*r+.7152*g+.0722*b;
/** Circular perimeter support is evaluated at multiple radii/centers.
 * Detects clear round seals, but never treats a found circle as verified text.
 */
export function circularSealScore(bitmap){
  const {width:w,height:h,data}=bitmap||{};
  if(!data||Math.min(w,h)<36)return 0;
  const size=Math.min(w,h),centers=[-.12,0,.12];
  let best=0;
  for(const ox of centers)for(const oy of centers){
    const cx=w/2+ox*size,cy=h/2+oy*size;
    for(const radiusRatio of [.26,.29,.32,.35,.375,.40,.43,.46,.49]){
      const r=size*radiusRatio;
      if(r<12)continue;
      const angles=72;
      let dark=0,valid=0;
      for(let i=0;i<angles;i++){
        const t=2*Math.PI*i/angles;
        const x=Math.round(cx+r*Math.cos(t)),y=Math.round(cy+r*Math.sin(t));
        if(x<0||x>=w||y<0||y>=h)continue;
        const j=(y*w+x)*4;
        valid++;
        let edge=false;
        for(let dr=-2;dr<=2;dr++){
          const px=Math.round(cx+(r+dr)*Math.cos(t));
          const py=Math.round(cy+(r+dr)*Math.sin(t));
          if(px<0||px>=w||py<0||py>=h)continue;
          const q=(py*w+px)*4;
          if(luma(data[q],data[q+1],data[q+2])<145){edge=true;break;}
        }
        if(edge)dark++;
      }
      if(valid>angles*.92)best=Math.max(best,dark/valid);
    }
  }
  return Math.round(best*100)/100;
}
export function regionFeatures(bitmap,words=[]){
  const {width:w,height:h,data}=bitmap||{};
  if(!data||w*h*4>data.length||w<2||h<2)
    throw new Error('Görüntü bölgesi okunamadı.');
  const step=Math.max(1,Math.floor(Math.sqrt(w*h/85000)));
  let samples=0,blue=0,dark=0,white=0,ink=0;
  let vertical=0,horizontal=0;
  for(let y=1;y<h-1;y+=step)for(let x=1;x<w-1;x+=step){
    const k=(y*w+x)*4,r=data[k],g=data[k+1],b=data[k+2];
    const light=luma(r,g,b);
    if(b-r>30&&b-g>9&&b>70&&light<205)blue++;
    if(light<120)dark++;
    if(light>221&&Math.abs(r-g)<22&&Math.abs(g-b)<22)white++;
    if(light<190)ink++;
    const left=(y*w+x-1)*4,above=((y-1)*w+x)*4;
    if(Math.abs(light-luma(data[left],data[left+1],data[left+2]))>45)vertical++;
    if(Math.abs(light-luma(data[above],data[above+1],data[above+2]))>45)horizontal++;
    samples++;
  }
  const scored=words.map(confidence).filter(x=>x!==null);
  const meanConf=scored.length?scored.reduce((a,b)=>a+b,0)/scored.length:null;
  return {width:w,height:h,aspect:w/Math.max(1,h),blue:blue/samples,
    dark:dark/samples,white:white/samples,ink:ink/samples,
    vertical:vertical/samples,horizontal:horizontal/samples,
    ring:circularSealScore(bitmap),wordCount:words.length,
    confidence:meanConf};
}
/** Avoid claiming reliable stamp/handwriting/signature recognition from pixels.
 * Output probability is a heuristic priority for review, not an ML confidence.
 */
export function classifyRegion(features,preferred=null){
  if(preferred&&REGION_LABELS[preferred])
    return {kind:preferred,certainty:1,reason:'Kullanıcı seçimi',manual:true};
  const f=features;
  if(f.ring>.52&&f.aspect>.70&&f.aspect<1.55&&f.dark>.014)
    return {kind:'stamp',certainty:clamp(.47+f.ring*.31,.5,.83),
      reason:'Yuvarlak koyu çizgiler; kaşe olabilir'};
  if(f.blue>.048&&f.wordCount<2&&f.aspect>2.8&&f.ink<.26)
    return {kind:'signature',certainty:.58,reason:'İnce renkli çizim; imza olabilir'};
  if(f.blue>.016&&f.confidence!==null&&f.confidence<72)
    return {kind:'handwriting',certainty:.59,
      reason:'Renkli kalem izleri ve düşük OCR güveni'};
  if(f.blue>.032&&f.wordCount<2)
    return {kind:'handwriting',certainty:.54,
      reason:'Renkli kalem/çizim izleri; doğrulama gerekli'};
  if(f.wordCount>=1&&f.confidence!==null&&f.confidence>=74)
    return {kind:'print',certainty:clamp(.55+f.confidence/350,.55,.84),
      reason:'OCR sözcükleri yüksek güvenle bulundu'};
  if(f.wordCount>=2&&f.dark>.01)
    return {kind:'print',certainty:.51,reason:'Düzenli satır sözcükleri algılandı'};
  return {kind:'uncertain',certainty:.29,
    reason:'Güvenilir bölge türü belirlenemedi'};
}
function merge(a,b){return{x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),
  x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)};}
/** Group Tesseract word boxes into rows without allowing full-page merging. */
export function groupWordRegions(words,width,height){
  const valid=(words||[]).filter(w=>w?.bbox&&String(w.text||'').trim())
    .map(w=>({word:w,box:normalizeRegion(w.bbox,width,height)}))
    .sort((a,b)=>(a.box.y0+a.box.y1)-(b.box.y0+b.box.y1)||a.box.x0-b.box.x0);
  const rows=[];
  for(const item of valid){
    const cy=(item.box.y0+item.box.y1)/2,h=item.box.y1-item.box.y0;
    let row=rows.find(r=>Math.abs(r.cy-cy)<Math.max(7,Math.min(h,r.height)*.55));
    if(!row){row={cy,height:h,entries:[]};rows.push(row);}
    row.entries.push(item);
    row.cy=row.entries.reduce((sum,x)=>sum+(x.box.y0+x.box.y1)/2,0)/row.entries.length;
    row.height=row.entries.reduce((sum,x)=>sum+(x.box.y1-x.box.y0),0)/row.entries.length;
  }
  const result=[];
  for(const row of rows){
    row.entries.sort((a,b)=>a.box.x0-b.box.x0);
    let run=null;
    for(const entry of row.entries){
      const gap=run?entry.box.x0-run.box.x1:0;
      const allowedGap=Math.max(12,row.height*3.5);
      if(run&&gap>allowedGap){
        result.push({box:run.box,words:run.words,origin:'ocr-line'});
        run=null;
      }
      if(!run)run={box:entry.box,words:[]};
      else run.box=merge(run.box,entry.box);
      run.words.push(entry.word);
    }
    if(run)result.push({box:run.box,words:run.words,origin:'ocr-line'});
  }
  return result.map(r=>({...r,box:normalizeRegion({
    x0:r.box.x0-4,y0:r.box.y0-4,x1:r.box.x1+4,y1:r.box.y1+4
  },width,height)}));
}
/** Detect pen-colored regions missed by OCR via a coarsened connected mask. */
export function detectInkRegions(bitmap,kind='blue',maxRegions=12){
  const {width:w,height:h,data}=bitmap||{};
  if(!data||w<64||h<64)return [];
  const tile=8,nx=Math.ceil(w/tile),ny=Math.ceil(h/tile);
  if(nx*ny>180000)return [];
  const hot=new Uint8Array(nx*ny);
  for(let ty=0;ty<ny;ty++)for(let tx=0;tx<nx;tx++){
    let matches=0,seen=0;
    for(let y=ty*tile;y<Math.min(h,(ty+1)*tile);y+=2)
      for(let x=tx*tile;x<Math.min(w,(tx+1)*tile);x+=2){
        const p=(y*w+x)*4,r=data[p],g=data[p+1],b=data[p+2],l=luma(r,g,b);
        if(kind==='blue'?b-r>35&&b-g>10&&l<200:l<115)matches++;
        seen++;
      }
    hot[ty*nx+tx]=matches>Math.max(1,seen*.085)?1:0;
  }
  const seen=new Uint8Array(hot.length),components=[];
  for(let k=0;k<hot.length;k++){
    if(!hot[k]||seen[k])continue;
    const queue=[k];seen[k]=1;
    let minX=nx,maxX=0,minY=ny,maxY=0,count=0;
    for(let i=0;i<queue.length;i++){
      const t=queue[i],x=t%nx,y=Math.floor(t/nx);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;
      // 8-neighborhood with one empty tile tolerated: joins handwriting strokes.
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        const xx=x+dx,yy=y+dy,j=yy*nx+xx;
        if(xx>=0&&xx<nx&&yy>=0&&yy<ny&&hot[j]&&!seen[j]){
          seen[j]=1;queue.push(j);
        }
      }
    }
    const box={x0:minX*tile,y0:minY*tile,
      x1:Math.min(w,(maxX+1)*tile),y1:Math.min(h,(maxY+1)*tile)};
    if(count>=3&&box.x1-box.x0>=18&&box.y1-box.y0>=10&&area(box)<w*h*.4)
      components.push({box,origin:kind==='blue'?'colored-ink':'dark-ink',score:count});
  }
  return components.sort((a,b)=>b.score-a.score).slice(0,maxRegions);
}
export function discoverRegions(bitmap,words=[],maxRegions=30){
  const {width:w,height:h}=bitmap||{};
  if(!w||!h)return [];
  const fromOcr=groupWordRegions(words,w,h);
  const ink=detectInkRegions(bitmap,'blue',12);
  const dark=detectInkRegions(bitmap,'dark',28);
  // Dark connected components can contain round seals missed by normal OCR.
  // Only add roughly square candidates with sufficient circular perimeter.
  const potentialSeals=dark.filter(candidate=>{
    const r=candidate.box,cw=r.x1-r.x0,ch=r.y1-r.y0;
    if(Math.min(cw,ch)<40||cw/ch<.65||cw/ch>1.60)return false;
    const clipData=new Uint8ClampedArray(cw*ch*4);
    for(let row=0;row<ch;row++)clipData.set(
      bitmap.data.subarray(((r.y0+row)*w+r.x0)*4,
        ((r.y0+row)*w+r.x0+cw)*4),row*cw*4);
    return circularSealScore({width:cw,height:ch,data:clipData})>.42;
  }).slice(0,5);
  const extras=[...ink,...potentialSeals].filter(candidate=>fromOcr.every(r=>
    intersect(r.box,candidate.box)/Math.min(area(r.box),area(candidate.box))<.55));
  const raw=[...fromOcr,...extras].slice(0,maxRegions);
  return raw.map((r,i)=>{
    const box=normalizeRegion(r.box,w,h),x=box.x0,y=box.y0,
      cw=box.x1-x,ch=box.y1-y,clipData=new Uint8ClampedArray(cw*ch*4);
    for(let row=0;row<ch;row++)clipData.set(
      bitmap.data.subarray(((y+row)*w+x)*4,((y+row)*w+x+cw)*4),row*cw*4);
    const inside=wordOverlap(words,box);
    const features=regionFeatures({width:cw,height:ch,data:clipData},inside);
    const guess=classifyRegion(features);
    return {id:'region-'+i,pageBox:box,origin:r.origin,
      words:inside,features,...guess};
  });
}
/** Text similarity is used to identify disagreements, NEVER to invent letters. */
export function normalizedText(s){
  return String(s||'').normalize('NFKC').toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
export function similarity(a,b){
  const left=[...normalizedText(a)],right=[...normalizedText(b)];
  if(!left.length&&!right.length)return 1;
  if(!left.length||!right.length)return 0;
  let prev=Array.from({length:right.length+1},(_,i)=>i);
  for(let i=1;i<=left.length;i++){
    const next=[i];
    for(let j=1;j<=right.length;j++)
      next[j]=Math.min(prev[j]+1,next[j-1]+1,prev[j-1]+(left[i-1]!==right[j-1]?1:0));
    prev=next;
  }
  return 1-prev[right.length]/Math.max(left.length,right.length);
}
export function assessCandidates(items){
  const candidates=(items||[]).map(x=>({...x,
    text:String(x.text||'').replace(/\s+/g,' ').trim(),
    confidence:Number.isFinite(Number(x.confidence))?
      clamp(Number(x.confidence),0,100):null}))
    .filter(x=>x.text);
  if(!candidates.length)return {text:'',confidence:0,uncertain:true,reason:'Okunamadı',candidates:[]};
  const scored=candidates.map((x,i)=>{
    const peers=candidates.filter((_,j)=>j!==i);
    const consensus=peers.length?Math.max(...peers.map(y=>similarity(x.text,y.text))):.32;
    const confidence=x.confidence===null?.40:x.confidence/100;
    return {...x,consensus,score:.62*confidence+.38*consensus};
  }).sort((a,b)=>b.score-a.score);
  const best=scored[0],runner=scored[1];
  const conflicted=runner&&similarity(best.text,runner.text)<.67 &&
    runner.score>best.score-.12;
  const uncertain=best.score<.68||Boolean(conflicted);
  return {text:uncertain?'':best.text,proposed:best.text,
    confidence:Math.round(best.score*100),
    uncertain,reason:conflicted?'Farklı OCR okumaları birbiriyle uyuşmuyor':
      uncertain?'Okuma güveni yetersiz':'OCR adayları uyumlu',
    candidates:scored};
}
