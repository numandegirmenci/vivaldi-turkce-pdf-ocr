import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRegion,regionFeatures,circularSealScore,classifyRegion,
  discoverRegions,assessCandidates,similarity,groupWordRegions,detectInkRegions} from '../Eklenti/smart-regions.mjs';
import {preprocessRegionPixels,safeAnalysisScale} from '../Eklenti/smart-image.mjs';
import {ocrRegionPlan,confidenceLabel} from '../Eklenti/smart-reader.mjs';

function page(w=280,h=180){
 const data=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<data.length;i+=4)
  data[i]=data[i+1]=data[i+2]=250,data[i+3]=255;
 return {width:w,height:h,data};
}
function paint(bitmap,x,y,rgb){
 if(x<0||y<0||x>=bitmap.width||y>=bitmap.height)return;
 const i=(y*bitmap.width+x)*4;
 bitmap.data.set([...rgb,255],i);
}
test('basılı metin, el yazısı ve imza türleri ayrı sınıflandırılır',()=>{
 const print=classifyRegion({ring:0,blue:0.001,wordCount:3,confidence:94,dark:.11});
 const handwriting=classifyRegion({ring:0,blue:.14,wordCount:0,confidence:null,dark:.02,ink:.11,aspect:2});
 const signature=classifyRegion({ring:0,blue:.16,wordCount:0,confidence:null,ink:.12,aspect:5});
 assert.equal(print.kind,'print');
 assert.equal(handwriting.kind,'handwriting');
 assert.equal(signature.kind,'signature');
 assert.ok(handwriting.certainty<.85,'heuristics must not pretend to be ML confidence');
});
test('yuvarlak kaşe çizgisi algılayıcı dairesel çevreyi bulur',()=>{
 const bitmap=page(120,120);
 for(let a=0;a<360;a+=.9){
  const t=a*Math.PI/180;
  const x=Math.round(60+45*Math.cos(t));
  const y=Math.round(60+45*Math.sin(t));
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)
    paint(bitmap,x+dx,y+dy,[25,28,34]);
 }
 const ring=circularSealScore(bitmap);
 assert.ok(ring>.52,'circle score '+ring);
 const features=regionFeatures(bitmap,[{confidence:50,text:'T.C'}]);
 const detected=classifyRegion(features);
 assert.equal(detected.kind,'stamp');
});
test('mavi el yazısı görüntüsü rengi ayrılarak arka filigran azaltılır',()=>{
 const bitmap=page(64,40);
 for(let y=12;y<24;y++)for(let x=7;x<53;x++)
   paint(bitmap,x,y,[50,75,173]);
 for(let y=30;y<36;y++)for(let x=0;x<64;x++)
   paint(bitmap,x,y,[198,222,240]);
 const prepared=preprocessRegionPixels(bitmap,'blue-pen');
 assert.ok(prepared.data[(17*64+18)*4]<prepared.data[(33*64+18)*4],
  'pen should be darker than pale watermark');
 assert.deepEqual(preprocessRegionPixels(bitmap,'original').data,bitmap.data);
});
test('sözcük satırları farklı başlıklar olarak ayrılır',()=>{
 const words=[
  {text:'ÇALIŞMA',confidence:85,bbox:{x0:18,y0:10,x1:95,y1:27}},
  {text:'BELGESİ',confidence:87,bbox:{x0:102,y0:10,x1:178,y1:27}},
  {text:'SAYFA',confidence:80,bbox:{x0:15,y0:105,x1:64,y1:122}}
 ];
 const rows=groupWordRegions(words,250,160);
 assert.equal(rows.length,2);
 const list=discoverRegions(page(250,160),words,12);
 assert.ok(list.some(r=>r.words.some(w=>w.text==='ÇALIŞMA')));
});
test('sözcük güveni düşük ve OCR alternatifleri çelişkiliyken uydurma metin kabul edilmez',()=>{
 const r=assessCandidates([{name:'orijinal',text:'Adını deSlim Allı',confidence:30},
   {name:'kontrast',text:'Mulica bo be düler',confidence:28}]);
 assert.equal(r.uncertain,true);
 assert.equal(r.text,'');
 assert.ok(r.candidates.length===2);
 assert.ok(similarity('BELEDİYE','BELEDiYE')>.8);
});
test('yüksek güvenli uyuşan sonuçlar aday metin gösterir',()=>{
 const r=assessCandidates([{name:'1',text:'ÇALIŞMA BELGESİ',confidence:93},
   {name:'2',text:'ÇALIŞMA BELGESİ',confidence:90}]);
 assert.equal(r.uncertain,false);
 assert.equal(r.text,'ÇALIŞMA BELGESİ');
 assert.match(confidenceLabel(r),/Yüksek güven/);
});
test('imza için OCR adayları çalıştırılmaz; kaşede dairesel OCR denemesi bulunur',()=>{
 assert.equal(ocrRegionPlan('signature',true).length,0);
 assert.ok(ocrRegionPlan('stamp',true).some(x=>x.mode==='ring'));
 assert.ok(ocrRegionPlan('handwriting').some(x=>x.psm===13));
 assert.ok(ocrRegionPlan('print').some(x=>x.psm===7));
});
test('yüksek çözünürlüklü yakınlaştırma görüntü belleğine göre sınırlandırılır',()=>{
 const large=safeAnalysisScale({x0:0,y0:0,x1:2400,y1:2200});
 assert.ok(large<=1.0+0.00001);
 const small=safeAnalysisScale({x0:0,y0:0,x1:120,y1:50});
 assert.ok(small>=2);
});
test('bölge seçiminde sayfa dışı koordinatlar sınırlandırılır',()=>{
 const result=normalizeRegion({x0:-40,y0:3,x1:500,y1:70},280,180);
 assert.deepEqual(result,{x0:0,y0:3,x1:280,y1:70});
});
