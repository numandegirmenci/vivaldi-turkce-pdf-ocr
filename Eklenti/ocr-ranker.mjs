/** Conservative multipass OCR ranking for mixed Turkish/scanned documents.
 * Prefer trustworthy words over hallucinated length. Keep layout PSM 3 when
 * quality is comparable; let sparse text PSM 11 win only when genuinely better.
 */
const finiteConfidence=value=>{
  const num=Number(value);
  return Number.isFinite(num)?Math.max(0,Math.min(100,num)):null;
};
export function wordConfidenceSummary(words=[]){
  const scored=words.map(w=>finiteConfidence(w.confidence??w.conf))
    .filter(v=>v!==null);
  if(!scored.length)return {average:null,weakFraction:0};
  return {average:scored.reduce((a,b)=>a+b,0)/scored.length,
    weakFraction:scored.filter(v=>v<45).length/scored.length};
}
export function qualityOfOcrResult(result,words=[],mode=3){
  const data=result?.data||result||{};
  const text=String(data.text||'');
  const letters=(text.match(/[\p{L}\p{N}]/gu)||[]).length;
  const tokenCount=words.filter(w=>/[\p{L}\p{N}]/u.test(w.text||'')).length;
  const lineCount=text.split(/\r?\n/).filter(s=>/[\p{L}\p{N}]/u.test(s)).length;
  const confidence=finiteConfidence(data.confidence)??0;
  const wordStats=wordConfidenceSummary(words);
  const avgWordConfidence=wordStats.average??confidence;
  const artifacts=(text.match(/[�|~_^]{2,}/g)||[]).length;
  const tinyTokens=words.filter(w=>String(w.text||'').replace(/\W/g,'').length===1).length;
  const malformed=(text.match(/[^\p{L}\p{N}\p{P}\p{Z}\n\t]/gu)||[]).length;
  // Restrict effect of raw character count: a hallucinated long reading
  // must not outrank a shorter, high-confidence real paragraph.
  const coverage=Math.min(160,letters)*.75+Math.min(100,tokenCount)*1.9+
    Math.min(60,lineCount)*1.9;
  return coverage + confidence*1.55 + avgWordConfidence*.7 -
    wordStats.weakFraction*85 - artifacts*12 - malformed*5 -
    Math.max(0,tinyTokens-tokenCount*.25)*1.7 +
    (mode===3?22:mode===6?8:mode===11?-8:0);
}
export function chooseBestOcrResult(candidates, collectWords){
  if(!candidates.length)throw new Error('OCR sonucu alınamadı.');
  const ranked=candidates.map(c=>{
    const words=collectWords(c.result?.data||{});
    return {...c,score:qualityOfOcrResult(c.result,words,c.mode)};
  }).sort((a,b)=>b.score-a.score);
  return ranked[0];
}
/** Additional OCR passes are triggered by weak reading, not by a manual checkbox.
 * The advanced option allows a more exhaustive pass for difficult documents.
 */
export function ocrPassPlan(data,words=[],advanced=false){
  const confidence=finiteConfidence(data?.confidence)??0;
  const wordStats=wordConfidenceSummary(words);
  const weak=wordStats.average!==null&&wordStats.average<72;
  const sparse=words.length<25;
  const lowConfidence=confidence<82;
  return {
    runLayoutBlock:advanced||sparse||lowConfidence||weak,
    runSparseText:advanced||(words.length<15&&confidence<86),
    runContrast:advanced||(confidence<75&&words.length<45)||weak,
    runSparseContrast:advanced&&(words.length<20||confidence<65)
  };
}
