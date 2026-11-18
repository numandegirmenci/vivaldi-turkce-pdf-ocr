/** Çoklu Tesseract okumasında satır kaybını ve okunmayan sözcükleri cezalandırır. */
export function qualityOfOcrResult(result,words=[],mode=3){
  const data=result?.data||result||{};
  const text=String(data.text||'');
  const meaningful=(text.match(/[\p{L}\p{N}]/gu)||[]).length;
  const tokenCount=words.filter(w=>/[\p{L}\p{N}]/u.test(w.text||'')).length;
  const lineCount=text.split(/\r?\n/).filter(s=>/[\p{L}\p{N}]/u.test(s)).length;
  const confidence=Number.isFinite(Number(data.confidence))?Math.max(0,Math.min(100,Number(data.confidence))):0;
  const artifacts=(text.match(/[�|~_^]{2,}/g)||[]).length;
  // PSM 3 doğal belge düzenini korur; seyrek metin PSM 11 yalnız belirgin üstünlükte kazanmalı.
  return meaningful*1.4 + Math.min(tokenCount,1000)*2.3 + Math.min(lineCount,300)*3 + confidence*.65
       - artifacts*7 + (mode===3?35:mode===6?12:0);
}
export function chooseBestOcrResult(candidates, collectWords){
  if(!candidates.length)throw new Error('OCR sonucu alınamadı.');
  const ranked=candidates.map(c=>({
    ...c,score:qualityOfOcrResult(c.result,collectWords(c.result?.data||{}),c.mode)
  })).sort((a,b)=>b.score-a.score);
  return ranked[0];
}
