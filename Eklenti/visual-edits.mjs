/** Visible edits are page-coordinate overlays; the original PDF is never modified in place. */
export function clampBox(box, width, height) {
  const numbers=[box?.x0,box?.y0,box?.x1,box?.y1,width,height].map(Number);
  if(!numbers.every(Number.isFinite)||width<=0||height<=0)throw new Error('Geçersiz düzenleme alanı.');
  const [a,b,c,d]=numbers;
  const x0=Math.max(0,Math.min(width,Math.min(a,c)));
  const x1=Math.max(0,Math.min(width,Math.max(a,c)));
  const y0=Math.max(0,Math.min(height,Math.min(b,d)));
  const y1=Math.max(0,Math.min(height,Math.max(b,d)));
  if(x1-x0<5||y1-y0<4)throw new Error('Yazı alanı çok küçük.');
  return {x0,y0,x1,y1};
}
export function safeEditText(value) {
  const text=String(value??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').trim();
  if(!text)throw new Error('Yeni yazıyı gir.');
  if(text.length>300)throw new Error('En fazla 300 karakter yazılabilir.');
  if(text.split('\n').length>5)throw new Error('Bir düzenleme en fazla 5 satır olabilir.');
  return text;
}
export function hexColor(value, fallback='#ffffff') {
  const raw=String(value||'');
  return /^#[\da-f]{6}$/i.test(raw)?raw.toLowerCase():fallback;
}
export function colorComponents(value) {
  const hex=hexColor(value);
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
}
export function normalizeVisibleEdit(input, pageWidth, pageHeight) {
  const box=clampBox(input.box,pageWidth,pageHeight);
  const deleting=input.operation==='delete', adding=input.operation==='add';
  const text=deleting?'':safeEditText(input.text);
  const fontSize=Number(input.fontSize);
  return {
    id:String(input.id||'').slice(0,80),
    box,text,operation:deleting?'delete':adding?'add':'replace',
    original:String(input.original||'').slice(0,300),
    sourceKind:adding?'manual':['ocr','native','manual'].includes(input.sourceKind)?input.sourceKind:'manual',
    sourceIndex:!adding&&Number.isInteger(input.sourceIndex)&&input.sourceIndex>=0?input.sourceIndex:null,
    sourceIndices:!adding&&Array.isArray(input.sourceIndices)?[...new Set(input.sourceIndices.filter(n=>Number.isInteger(n)&&n>=0))].slice(0,200):[],
    fontSize:Number.isFinite(fontSize)?Math.max(5,Math.min(180,fontSize)):Math.max(8,Math.min(36,(box.y1-box.y0)*.76)),
    ink:hexColor(input.ink,'#172b3d'),
    fill:hexColor(input.fill,'#ffffff'),
    bold:input.bold===true,
    styleConfidence:Number.isFinite(Number(input.styleConfidence))
      ?Math.max(0,Math.min(1,Number(input.styleConfidence))):0,
    texturedBackground:input.texturedBackground===true
  };
}
export function fitVisibleText(text, width, height, preferredSize, measureAtOne) {
  const lines=safeEditText(text).split('\n');
  const padding=Math.max(.5,Math.min(3,Math.min(width,height)*.045));
  const freeWidth=Math.max(.1,width-2*padding);
  const freeHeight=Math.max(.1,height-2*padding);
  const measured=lines.map(line=>Math.max(0,Number(measureAtOne(line))||0));
  const textWidth=Math.max(.001,...measured);
  const fit=Math.min(Number(preferredSize)||12,freeWidth/textWidth,freeHeight/(lines.length*1.18));
  if(!Number.isFinite(fit)||fit<1.5)throw new Error('Metin bu alana sığmıyor. Daha kısa yazı veya daha geniş alan seç.');
  return {fontSize:fit,lineHeight:fit*1.18,lines,padding};
}
/** Fit the interactive annotation box to its text, not the initial click area. */
export function compactAnnotationBox({box,text,fontSize,pageWidth,pageHeight,measureAtOne}) {
  const lines=safeEditText(text).split('\n');
  const size=Math.max(5,Math.min(180,Number(fontSize)||12));
  const padding=Math.max(1,Math.min(3,size*.10));
  const measured=Math.max(1,...lines.map(line=>Math.max(0,Number(measureAtOne(line))||0)));
  // Allow for browser/PDF font-metric differences without a large invisible hit area.
  const width=Math.min(pageWidth,Math.max(8,Math.ceil(measured*size*1.06+padding*2+1)));
  const height=Math.min(pageHeight,Math.max(6,Math.ceil(size*1.28*lines.length+padding*2+1)));
  const x0=Math.max(0,Math.min(box.x0,pageWidth-width));
  const y0=Math.max(0,Math.min(box.y0,pageHeight-height));
  return clampBox({x0,y0,x1:x0+width,y1:y0+height},pageWidth,pageHeight);
}
export function textWithVisibleEdits(original,view) {
  const edits=view?.edits||[];
  if(!edits.length)return String(original||'');
  if(view.textSource==='ocr'&&Array.isArray(view.words)&&view.words.length){
    const replacements=new Map(),removed=new Set(),extra=[];
    for(const e of edits){
      if(e.operation==='add'){extra.push(e.text);continue;}
      if(e.sourceKind==='ocr'&&e.sourceIndex!==null)replacements.set(e.sourceIndex,e.text);
      else if(e.sourceKind==='manual'&&e.sourceIndices?.length){
        const [first,...rest]=e.sourceIndices;
        replacements.set(first,e.text);
        for(const index of rest)removed.add(index);
      }else if(e.sourceKind==='manual')extra.push(e.text);
    }
    const words=view.words.flatMap((w,i)=>removed.has(i)||(replacements.has(i)&&!replacements.get(i))?[]:[{
      ...w,text:replacements.has(i)?replacements.get(i):w.text
    }]);
    // DOM-agnostic; the caller supplies its OCR formatter.
    return {words,extra};
  }
  let out=String(original||'');
  for(const e of edits){
    if(e.operation==='add')out+=(out?'\n':'')+e.text;
    else if(e.sourceKind==='native'&&e.original&&out.includes(e.original))
      out=out.replace(e.original,e.text);
    else if(e.sourceKind==='manual')out+=(out?'\n':'')+e.text;
  }
  return out;
}
