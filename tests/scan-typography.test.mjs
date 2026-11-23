import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestSameLineWord,findUnselectedOverlap,layoutScanReplacement,SCAN_FONTS} from '../Eklenti/scan-typography.mjs';

test('düzeltilen BAŞKANLIĞI yazısı için BELEDİYE aynı satırdan referans seçilir',()=>{
  const selected={x0:374,y0:260,x1:691,y1:323};
  const words=[
    {text:'T.C',bbox:{x0:357,y0:135,x1:435,y1:180}},
    {text:'AVCILAR',bbox:{x0:281,y0:199,x1:505,y1:244}},
    {text:'BELEDİYE',bbox:{x0:101,y0:262,x1:356,y1:312}},
    {text:'ÇALIŞMA',bbox:{x0:190,y0:342,x1:397,y1:380}},
    {text:'BAŞKANLIĞI',bbox:{x0:375,y0:262,x1:688,y1:312}}
  ];
  const same=nearestSameLineWord(words,selected);
  assert.equal(same?.text,'BELEDİYE');
});
test('sözcük genişliği uzadığında harf yüksekliği korunur; yalnız yatay ölçek değişir',()=>{
  const mock={font:'',measureText(word){
    const size=Number((this.font.match(/(\d+(?:\.\d+)?)px/)||[])[1]||45);
    return {width:word.length*size*.46,actualBoundingBoxLeft:0,
      actualBoundingBoxRight:word.length*size*.46,
      actualBoundingBoxAscent:size*.76,actualBoundingBoxDescent:size*.03};
  }};
  const box={x0:375,y0:261,x1:691,y1:323};
  const style={family:'OCRRobotoCondensed',weight:700,scaleX:.9,fontSize:64,refHeight:62};
  const result=layoutScanReplacement(mock,{box,text:'BAŞKANLIĞI',ink:'#111111',fill:'#fafafa'},style);
  assert.equal(result.weight,700);
  assert.ok(result.fontSize>=60,'harf yüksekliği korunmalı');
  assert.ok(result.scaleX<=.90);
  assert.ok(result.scaleX>.48);
});
test('fazla uzun yazıyı minik fonta indirip bozmadan hata gösterir',()=>{
  const fake={font:'',measureText(word){return {width:word.length*24,actualBoundingBoxLeft:0,
    actualBoundingBoxRight:word.length*24,actualBoundingBoxAscent:30,actualBoundingBoxDescent:0};}};
  const typ={family:'OCRAnton',weight:400,scaleX:1,fontSize:40,refHeight:50};
  assert.throws(()=>layoutScanReplacement(fake,{box:{x0:0,y0:0,x1:120,y1:50},
    text:'ÇOK UZUN BİR SATIRIN TAMAMI',ink:'#101010',fill:'#ffffff'},typ),/Daha geniş/);
});
test('font ailesi adayları hem dar hem normal Türkçe font içerir',()=>{
  assert.ok(SCAN_FONTS.some(x=>x.family==='OCRRobotoCondensed'));
  assert.ok(SCAN_FONTS.some(x=>x.family==='OCRAnton'));
  assert.ok(SCAN_FONTS.some(x=>x.family==='NotoSansOcr'));
});

test('AVCILAR yazısı dar ve aşırı uzun hale getirilmez; aşırı sıkıştırma reddedilir',()=>{
  const font={font:'',measureText(word){
    const m=/(\d+(?:\.\d+)?)px/.exec(this.font),size=Number(m?.[1]||50);
    const width=[...word].length*size*.70;
    return {width,actualBoundingBoxLeft:0,actualBoundingBoxRight:width,
      actualBoundingBoxAscent:size*.75,actualBoundingBoxDescent:size*.02};
  }};
  assert.throws(()=>layoutScanReplacement(font,{
    box:{x0:100,y0:100,x1:225,y1:168},text:'AVCILAR',
    ink:'#111111',fill:'#fafafa'
  },{family:'OCRAnton',weight:400,scaleX:.52,fontSize:84,refHeight:68}),
  /Daha geniş bir alan/);
});
test('ÇALIŞMA BELGESİ alanı komşu kelimeyi kısmen kesiyorsa uygulama durur',()=>{
  const words=[
    {text:'ÇALIŞMA',bbox:{x0:100,y0:20,x1:220,y1:60}},
    {text:'BELGESİ',bbox:{x0:230,y0:20,x1:360,y1:60}},
    {text:'ALAN',bbox:{x0:375,y0:20,x1:440,y1:60}}
  ];
  assert.equal(findUnselectedOverlap(words,{x0:228,y0:20,x1:290,y1:60},[1]).length,0,
    'seçilen sözcük bilinçli olarak değiştirilmek isteniyor');
  const result=findUnselectedOverlap(words,{x0:200,y0:20,x1:290,y1:60},[1]);
  assert.equal(result[0]?.word,'ÇALIŞMA');
  assert.equal(findUnselectedOverlap(words,{x0:230,y0:20,x1:360,y1:60},[1]).length,0);
});
test('yüksekliği koruyan kısa metin için yatay ölçek güvenli kalır',()=>{
  const font={font:'',measureText(word){
    const m=/(\d+(?:\.\d+)?)px/.exec(this.font),size=Number(m?.[1]||50);
    const width=[...word].length*size*.53;
    return {width,actualBoundingBoxLeft:0,actualBoundingBoxRight:width,
      actualBoundingBoxAscent:size*.75,actualBoundingBoxDescent:size*.02};
  }};
  const out=layoutScanReplacement(font,{box:{x0:20,y0:10,x1:310,y1:64},
    text:'BAŞKANLIĞI',ink:'#111111',fill:'#ffffff'},
    {family:'OCRRobotoCondensed',weight:700,scaleX:.96,fontSize:59,refHeight:54});
  assert.ok(out.scaleX>=.84);
  assert.ok(out.scaleX<=1.16);
});
