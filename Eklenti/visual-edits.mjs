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
  const text=safeEditText(input.text);
  const fontSize=Number(input.fontSize);
  return {
    id:String(input.id||'').slice(0,80),
    box,text,
    original:String(input.original||'').slice(0,300),
    sourceKind:['ocr','native','manual'].includes(input.sourceKind)?input.sourceKind:'manual',
    sourceIndex:Number.isInteger(input.sourceIndex)&&input.sourceIndex>=0?input.sourceIndex:null,
    fontSize:Number.isFinite(fontSize)?Math.max(5,Math.min(180,fontSize)):Math.max(8,Math.min(36,(box.y1-box.y0)*.76)),
    ink:hexColor(input.ink,'#172b3d'),
    fill:hexColor(input.fill,'#ffffff')
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
export function textWithVisibleEdits(original,view) {
  const edits=view?.edits||[];
  if(!edits.length)return String(original||'');
  if(view.textSource==='ocr'&&Array.isArray(view.words)&&view.words.length){
    const replacements=new Map(edits.filter(e=>e.sourceKind==='ocr'&&e.sourceIndex!==null)
      .map(e=>[e.sourceIndex,e.text]));
    const words=view.words.map((w,i)=>replacements.has(i)?{...w,text:replacements.get(i)}:w);
    // This module remains DOM-agnostic: the caller may supply its existing OCR formatter.
    return {words,extra:edits.filter(e=>e.sourceKind==='manual').map(e=>e.text)};
  }
  let out=String(original||'');
  for(const e of edits){
    if(e.sourceKind==='native'&&e.original&&out.includes(e.original))
      out=out.replace(e.original,e.text);
    else if(e.sourceKind==='manual')out+=(out?'\n':'')+e.text;
  }
  return out;
}
