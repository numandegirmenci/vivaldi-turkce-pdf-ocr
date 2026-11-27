import {clampBox} from './visual-edits.mjs';
import {findUnselectedOverlap} from './scan-typography.mjs';

/**
 * OCR typically returns a tight glyph bounding box, sometimes with the real
 * antialiased edge outside it. The repair engine needs a little safe whitespace.
 * Enlarge only inside the page and ONLY when it does not cover another OCR word.
 */
export function prepareEditGeometry({box,pageWidth,pageHeight,words=[],sourceIndices=[],sourceIndex=null,sourceKind='ocr',maxPadding=null}){
  const original=clampBox(box,pageWidth,pageHeight);
  const targetHeight=original.y1-original.y0;
  const source=[...new Set([...(sourceIndices||[]),sourceIndex].filter(Number.isInteger))];
  const selected=new Set(source);
  // Even a one-pixel overlap is unsafe when the repair region could touch a
  // neighbor. The generic OCR guard uses a >13% threshold which is too loose
  // for auto-expansion.
  const touchesOtherWord=candidate=>words.some((w,index)=>{
    if(selected.has(index)||!w?.bbox||!String(w.text||'').trim())return false;
    const r=w.bbox;
    return Math.min(candidate.x1,r.x1)-Math.max(candidate.x0,r.x0)>.15 &&
      Math.min(candidate.y1,r.y1)-Math.max(candidate.y0,r.y0)>.15;
  });
  let expanded=original,padding=0;
  if(sourceKind==='ocr'){
    const desired=Math.max(2,Math.min(
      Number.isFinite(maxPadding)?Math.max(2,Math.floor(maxPadding)):22,
      Math.max(4,Math.ceil(targetHeight*.36))));
    for(let delta=1;delta<=desired;delta++){
      const candidate=clampBox({
        x0:Math.floor(original.x0-delta),y0:Math.floor(original.y0-delta),
        x1:Math.ceil(original.x1+delta),y1:Math.ceil(original.y1+delta)
      },pageWidth,pageHeight);
      if(touchesOtherWord(candidate))break;
      expanded=candidate;padding=delta;
    }
    if(padding<2){
      throw new Error('OCR kelimesinin çevresinde yeterli boşluk yok. Komşu yazıya dokunmadan düzenlemek için Shift + sürükle ile daha geniş, temiz bir alan seç.');
    }
  }
  // Crop PNG to integer canvas pixel coordinates for 1:1 preview/export.
  const adjusted=clampBox({
    x0:Math.floor(expanded.x0),y0:Math.floor(expanded.y0),
    x1:Math.ceil(expanded.x1),y1:Math.ceil(expanded.y1)
  },pageWidth,pageHeight);
  if(findUnselectedOverlap(words,adjusted,source,null).length)
    throw new Error('Seçim alanı başka bir kelimeyi kesiyor. Alanı yeniden seç.');
  return {box:adjusted,targetHeight,padding};
}


/** Try larger and smaller safe crops: too-wide OCR padding can accidentally
 * include glyphs from another line even when the OCR neighbor box is wrong.
 * A render candidate is accepted only if its pixel-safety checks pass.
 */
export function prepareEditCandidates(args){
  if(args.sourceKind!=='ocr')return [prepareEditGeometry(args)];
  const widest=prepareEditGeometry(args);
  const out=[],seen=new Set();
  for(let padding=widest.padding;padding>=2;padding--){
    try{
      const candidate=prepareEditGeometry({...args,maxPadding:padding});
      const key=JSON.stringify(candidate.box);
      if(!seen.has(key)){seen.add(key);out.push(candidate);}
    }catch{ /* too narrow: wider candidates were already checked */ }
  }
  return out;
}
