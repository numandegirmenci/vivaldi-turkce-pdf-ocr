import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareEditGeometry} from '../Eklenti/edit-geometry.mjs';
import {planSelectiveRemoval,combineSelectiveLayers,validateTransparentPatch} from '../Eklenti/selective-repair.mjs';
import {layoutScanReplacement} from '../Eklenti/scan-typography.mjs';

const words=[
  {text:'T.C',bbox:{x0:350,y0:265,x1:407,y1:300}},
  {text:'AVCILAR',bbox:{x0:300,y0:320,x1:525,y1:368}},
  {text:'BELEDİYE',bbox:{x0:160,y0:384,x1:370,y1:428}},
  {text:'BAŞKANLIĞI',bbox:{x0:385,y0:384,x1:650,y1:428}},
  {text:'ÇALIŞMA',bbox:{x0:225,y0:449,x1:415,y1:481}}
];
test('ekrandaki AVCILAR → AKCIKAR örneği OCR alanını güvenle otomatik genişletir',()=>{
  const result=prepareEditGeometry({box:words[1].bbox,pageWidth:800,pageHeight:880,
    words,sourceKind:'ocr',sourceIndex:1,sourceIndices:[1]});
  assert.equal(result.targetHeight,48,'yeni font için gerçek yazı yüksekliği saklanır');
  assert.ok(result.padding>=8,'dar OCR seçimine harf koruma payı eklenir');
  assert.ok(result.box.x0<words[1].bbox.x0);
  assert.ok(result.box.x1>words[1].bbox.x1);
  assert.ok(result.box.y0<words[1].bbox.y0);
  assert.ok(result.box.y1>words[1].bbox.y1);
});
test('satırdaki yakın kelimeler varsa OCR kutusu onlara taşmadan genişler',()=>{
  const near=[
    {text:'A',bbox:{x0:40,y0:10,x1:65,y1:41}},
    {text:'B',bbox:{x0:72,y0:10,x1:105,y1:41}}
  ];
  const result=prepareEditGeometry({box:near[0].bbox,pageWidth:200,pageHeight:100,
    words:near,sourceKind:'ocr',sourceIndex:0,sourceIndices:[0]});
  assert.ok(result.box.x1<=72,'komşu sözcükler korunur');
});
test('çok yakın sözcükler arasında güvenli boşluk yoksa müdahale reddedilir',()=>{
  const near=[
    {text:'A',bbox:{x0:40,y0:10,x1:65,y1:41}},
    {text:'B',bbox:{x0:67,y0:10,x1:105,y1:41}}
  ];
  assert.throws(()=>prepareEditGeometry({box:near[0].bbox,pageWidth:200,pageHeight:100,
    words:near,sourceKind:'ocr',sourceIndex:0,sourceIndices:[0]}),/yeterli boşluk yok/);
});
test('otomatik OCR kutusu genişlese de font yüksekliği değişmeden korunur',()=>{
  const metrics={font:'',measureText(value){
    const size=Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1])||50;
    return {width:String(value).length*size*.49,actualBoundingBoxAscent:size*.72,
      actualBoundingBoxDescent:size*.04,actualBoundingBoxLeft:0,
      actualBoundingBoxRight:String(value).length*size*.49};
  }};
  const result=prepareEditGeometry({box:words[1].bbox,pageWidth:800,pageHeight:880,
    words,sourceKind:'ocr',sourceIndex:1,sourceIndices:[1]});
  const typography={family:'OCRRobotoCondensed',weight:700,scaleX:1,
    fontSize:59,refHeight:48,targetHeight:result.targetHeight};
  const plan=layoutScanReplacement(metrics,{box:result.box,text:'AKCIKAR'},typography);
  assert.equal(plan.fontSize,59,'kutu genişledi diye yazı büyütülmez');
});
test('tarama benzeri piksel katmanında harfler değişir, yazı dışı tüm pikseller saydam kalır',()=>{
  const w=244,h=68,source=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=(y*w+x)*4;
    // Approximate dark printed letters in the middle of scanned white paper.
    const glyph=x>=11&&x<233&&y>=10&&y<58&&(x%21)<11;
    const value=glyph?43:250+(x*3+y)%5;
    source[k]=source[k+1]=source[k+2]=value;source[k+3]=255;
  }
  const mask=planSelectiveRemoval({width:w,height:h,data:source},
    {ink:'#2b2b2c',fill:'#ffffff'});
  const added=new Uint8ClampedArray(w*h*4);
  for(let y=12;y<56;y++)for(let x=30;x<49;x++)
    added[(y*w+x)*4+3]=255;
  const corrected=combineSelectiveLayers(mask,added,'#2b2b2c');
  assert.ok(mask.oldGlyphPixels>300);
  assert.equal(validateTransparentPatch(corrected,mask,added),true);
  assert.equal(corrected.data[(1*w+1)*4+3],0,
    'unmodified white page pixel MUST remain fully transparent');
});
