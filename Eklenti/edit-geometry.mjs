import {clampBox} from './visual-edits.mjs';
import {findUnselectedOverlap} from './scan-typography.mjs';

/**
 * OCR typically returns a tight glyph bounding box, sometimes with the real
 * antialiased edge outside it. The repair engine needs a little safe whitespace.
 * Enlarge only inside the page and ONLY when it does not cover another OCR word.
 */
export function prepareEditGeometry({box,pageWidth,pageHeight,words=[],sourceIndices=[],sourceIndex=null,sourceKind='ocr'}){
  const original=clampBox(box,pageWidth,pageHeight);
  const targetHeight=original.y1-original.y0;
  const source=[...new Set([...(sourceIndices||[]),sourceIndex].filter(Number.isInteger))];
  let expanded=original,padding=0;
  if(sourceKind==='ocr'){
    const desired=Math.max(4,Math.min(14,Math.ceil(targetHeight*.20)));
    for(let delta=1;delta<=desired;delta++){
      const candidate=clampBox({
        x0:Math.floor(original.x0-delta),y0:Math.floor(original.y0-delta),
        x1:Math.ceil(original.x1+delta),y1:Math.ceil(original.y1+delta)
      },pageWidth,pageHeight);
      if(findUnselectedOverlap(words,candidate,source,null).length)break;
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
