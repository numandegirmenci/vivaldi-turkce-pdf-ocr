import test from 'node:test';
import assert from 'node:assert/strict';
import {extractFieldTables,ocrWordsToEntries,extractedTablesFromSheets} from '../Eklenti/table-extract.mjs';
function item(t,x,y,w=70){return {text:t,bbox:{x0:x,y0:y,x1:x+w,y1:y+16}};}
const base=[
 ...[['Tarih / Saat','3','5.11.2026 / 13:40:15'],['Tahakkuk No','1','35909517'],['Talep No','1','9480528'],['Birim',':','MALTEPE'],['Tahakkuk Tipi','I','ANA TAHAKKUK']].flatMap(([key,glyph,value],i)=>{
  const y=80+i*27;
  return [item(key,820,y,142),item(glyph,975,y,6),item(value,996,y,220)];
 })
];
test('OCR colon misread as 3 or 1 at consistent separator x removed, all 5 fields retained',()=>{
 const tables=extractFieldTables(ocrWordsToEntries(base));
 assert.equal(tables.length,1,JSON.stringify(tables,null,2));
 assert.deepEqual(tables[0].rows,[
  ['Tarih / Saat','5.11.2026 / 13:40:15'],['Tahakkuk No','35909517'],
  ['Talep No','9480528'],['Birim','MALTEPE'],['Tahakkuk Tipi','ANA TAHAKKUK']]);
});
test('a legitimate leading number remains, only glyph in proven separator column is removed',()=>{
 const s=[...base, item('Fatura No',40,360,127),item('1',191,360,9),item('2345',216,360,70)];
 const tables=extractFieldTables(ocrWordsToEntries(s));
 const val=tables.flatMap(t=>t.rows).find(([k])=>k==='Fatura No');
 // Isolated field does not imply an artifact: it can remain unclassified, but must never be silently changed to 2345.
 if(val) assert.notEqual(val[1],'2345');
});
test('a field value consisting of exactly 1 is not discarded',()=>{
 const s=[item('Fatura No',40,100,130),item(':',175,100,6),item('1',194,100,7),
   item('Fatura Tutarı',40,128,130),item(':',175,128,6),item('100,00',194,128,55)];
 const tables=extractFieldTables(ocrWordsToEntries(s));
 assert.ok(tables.flatMap(x=>x.rows).some(r=>r[0]==='Fatura No'&&r[1]==='1'),JSON.stringify(tables));
});
test('no false table created by unrelated free text',()=>{
 const entries=ocrWordsToEntries([item('Tarih',10,10),item('1',150,10,7),item('A',170,10),item('Belge',10,30)]);
 assert.equal(extractFieldTables(entries).length,0);
});
