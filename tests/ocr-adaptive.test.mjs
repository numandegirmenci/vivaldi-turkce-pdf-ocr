import test from 'node:test';
import assert from 'node:assert/strict';
import {qualityOfOcrResult,chooseBestOcrResult,ocrPassPlan,wordConfidenceSummary} from '../Eklenti/ocr-ranker.mjs';
import {collectOcrWords} from '../Eklenti/text-utils.mjs';

const word=(text,confidence=88,x=0)=>({text,confidence,bbox:{x0:x,y0:1,x1:x+12,y1:18}});
test('Tesseract sözcük güven puanı saklanır',()=>{
 const words=collectOcrWords({words:[word('ÇALIŞMA',94),word('BELGESİ',88,20)]});
 assert.deepEqual(words.map(w=>w.confidence),[94,88]);
});
test('yüksek doğruluklu kısa OCR yanlış uzun hallucination karşısında korunur',()=>{
 const good={result:{data:{text:'ÇALIŞMA BELGESİ\nKOZMETİK ÜRÜNLERİ SATIŞI',confidence:95,
   words:[word('ÇALIŞMA',93),word('BELGESİ',91,20),word('KOZMETİK',90,42)]}},mode:3};
 const bad={result:{data:{text:'ÇALIŞŞMAA BEE LGE5I \nKOZMEVİK URUNLERI SATİŞİ \n~_|~ ^_ \n'+'Z'.repeat(80),
   confidence:40,words:Array.from({length:30},(_,i)=>word('X',19,i*12))}},mode:11};
 const preferred=chooseBestOcrResult([bad,good],collectOcrWords);
 assert.equal(preferred.mode,3);
});
test('başlık az sözcüklüyse PSM 11 ikinci kez otomatik denenir',()=>{
 const p=ocrPassPlan({confidence:72},[word('T.C',77),word('AVCILAR',70)],false);
 assert.equal(p.runLayoutBlock,true);
 assert.equal(p.runSparseText,true);
 assert.equal(p.runContrast,true);
});
test('kaliteli büyük belgeye gereksiz ikinci OCR turu yaptırılmaz',()=>{
 const words=Array.from({length:65},(_,i)=>word('Belge'+i,95,i*10));
 const plan=ocrPassPlan({confidence:97},words,false);
 assert.equal(plan.runLayoutBlock,false);
 assert.equal(plan.runSparseText,false);
 assert.equal(plan.runContrast,false);
});
test('OCR word confidence summary düşük güvenli sözcükleri ayrı hesaplar',()=>{
 const stat=wordConfidenceSummary([word('A',90),word('B',15)]);
 assert.equal(stat.average,52.5);
 assert.equal(stat.weakFraction,.5);
});
test('aynı metin ve eşit güvene sahip sonuçlarda sayfa düzeni PSM 3 tercih edilir',()=>{
 const words=[word('Kocaeli',90),word('İzmit',90)];
 assert.ok(qualityOfOcrResult({text:'Kocaeli İzmit',confidence:92},words,3)>
   qualityOfOcrResult({text:'Kocaeli İzmit',confidence:92},words,11));
});
