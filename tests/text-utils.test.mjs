import test from 'node:test';
import assert from 'node:assert/strict';
import {hasUsablePdfText,formatPdfText,collectOcrWords,getSafeRenderScale} from '../Eklenti/text-utils.mjs';
const viewport={scale:1,convertToViewportPoint:(x,y)=>[x,-y]};
const item=(str,x,y,width,height=10)=>({str,transform:[1,0,0,1,x,y],width,height});
test('OCR katmanı olan tabloyu OCR ile tekrar bozmamalı',()=>{
  const tc={items:[item('S.Güvenlik No',10,70,70),item('10097605446',10,50,65)]};
  assert.equal(hasUsablePdfText(tc),true);
});
test('Yalnız sayfa numarası olan taramayı OCR et',()=>{
  assert.equal(hasUsablePdfText({items:[item('1',10,10,5)]}),false);
});
test('metin satırları y/x konumuna göre sıralanır, tablo hücreleri ayrılır',()=>{
  const tc={items:[item('Bağcı',200,50,40),item('S.Güvenlik No',20,70,100),item('10097605446',20,50,66),item('Ad Soyad',200,70,65)]};
  assert.equal(formatPdfText(tc,viewport),'S.Güvenlik No\tAd Soyad\n10097605446\tBağcı');
});
test('OCR v5 sözcük koordinatlarını seçilebilir hale getir',()=>{
  const d={words:[{text:'Merhaba',bbox:{x0:12,y0:23,x1:78,y1:39}}]};
  assert.equal(collectOcrWords(d).length,1);
});
test('OCR blok yapısındaki sözcükleri bul',()=>{
  const d={blocks:[{paragraphs:[{lines:[{words:[{text:'Dünya',bbox:{x0:5,y0:12,x1:30,y1:24}}]}]}]}]};
  assert.equal(collectOcrWords(d)[0].text,'Dünya');
});
test('OCR TSV yedeğinden kelimeleri çıkar',()=>{
  const d={tsv:'level\tpage_num\tleft\ttop\twidth\theight\ttext\n5\t1\t15\t25\t60\t18\tMerhaba'};
  assert.deepEqual(collectOcrWords(d)[0].bbox,{x0:15,y0:25,x1:75,y1:43});
});

test('tek satırlı kısa ama anlamlı PDF metnini de bozma',()=>{
  assert.equal(hasUsablePdfText({items:[item('Merhaba',1,1,50)]}),true);
  assert.equal(hasUsablePdfText({items:[item('10097605446',1,1,50)]}),true);
  assert.equal(hasUsablePdfText({items:[item('Sayfa 3',1,1,50)]}),false);
  assert.equal(hasUsablePdfText({items:[item('2',1,1,10)]}),false);
});
test('çok büyük PDF sayfası ve çok sayfalı PDF bellek sınırını aşmaz',()=>{
  const s=getSafeRenderScale({width:600,height:800},200);
  assert.ok(600*800*s*s<=100000000/200+1);
  const huge=getSafeRenderScale({width:100000,height:5000},1);
  assert.ok(100000*huge<=8192);
  assert.throws(()=>getSafeRenderScale({width:0,height:200}),/geçersiz/);
});
test('OCR olmayan boş blok ve bozuk koordinatlar atlanır',()=>{
  assert.deepEqual(collectOcrWords({words:[{text:'bozuk',bbox:{x0:1,y0:3,x1:0,y1:4}}]}),[]);
  assert.deepEqual(collectOcrWords({words:[],blocks:[]}),[]);
});
