import test from 'node:test';
import assert from 'node:assert/strict';
import {clampBox,safeEditText,normalizeVisibleEdit,fitVisibleText,textWithVisibleEdits,colorComponents} from '../Eklenti/visual-edits.mjs';

test('görsel yazı alanı sayfa sınırları içinde tutulur',()=>{
  assert.deepEqual(clampBox({x0:-4,y0:-9,x1:120,y1:40},100,100),{x0:0,y0:0,x1:100,y1:40});
  assert.throws(()=>clampBox({x0:4,y0:4,x1:5,y1:5},100,100),/küçük/);
});
test('metin, renk ve boyut alanları güvenli sınırlandırılır',()=>{
  assert.equal(safeEditText('  Şişli Çeşme \n 123 '),'Şişli Çeşme \n 123');
  assert.throws(()=>safeEditText(' '),/Yeni yazıyı/);
  assert.throws(()=>safeEditText('a'.repeat(301)),/300/);
  const e=normalizeVisibleEdit({box:{x0:20,y0:20,x1:130,y1:50},text:'Yeni ı İ ğ',
    fontSize:2000,ink:'javascript:alert(1)',fill:'#abcdef',sourceIndices:[0,1,1,-5]},180,200);
  assert.equal(e.fontSize,180);
  assert.equal(e.ink,'#172b3d');
  assert.deepEqual(e.sourceIndices,[0,1]);
  assert.deepEqual(colorComponents('#ff0000'),[1,0,0]);
});
test('yeni satırlar görüntü alanına sığacak şekilde küçültülür',()=>{
  const plan=fitVisibleText('İzmit\nKocaeli',90,40,23,s=>s.length*.57);
  assert.equal(plan.lines.length,2);
  assert.ok(plan.fontSize<=23);
  assert.ok(plan.lineHeight*2+plan.padding*2<=40.001);
});
test('OCR kelimesi yerine yeni metin gelir, kaplanan diğer kelimeler çıkarılır',()=>{
  const view={
    textSource:'ocr',
    words:[{text:'ESKİ',bbox:{x0:0,y0:0,x1:40,y1:20}},
      {text:'BEDEL',bbox:{x0:42,y0:0,x1:100,y1:20}},
      {text:'100',bbox:{x0:104,y0:0,x1:130,y1:20}}],
    edits:[{sourceKind:'manual',sourceIndices:[0,1],text:'YENİ BEDEL'}]
  };
  const changed=textWithVisibleEdits('ESKİ BEDEL 100',view);
  assert.deepEqual(changed.words.map(w=>w.text),['YENİ BEDEL','100']);
});

test('explicit delete removes selected OCR word without allowing accidental empty replacement',()=>{
  const box={x0:10,y0:10,x1:90,y1:35};
  const edit=normalizeVisibleEdit({box,operation:'delete',text:'',sourceKind:'ocr',sourceIndex:0,original:'ÖRNEK'},200,200);
  assert.equal(edit.operation,'delete');
  assert.equal(edit.text,'');
  const result=textWithVisibleEdits('ÖRNEK METİN',{textSource:'ocr',words:[{text:'ÖRNEK'},{text:'METİN'}],edits:[edit]});
  assert.deepEqual(result.words.map(w=>w.text),['METİN']);
  assert.throws(()=>normalizeVisibleEdit({box,text:''},200,200),/Yeni yazıyı/);
});
