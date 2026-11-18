import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTable,extractTables,ocrWordsToEntries,moneyValue} from '../Eklenti/table-extract.mjs';
test('numeric table OCR borders are cleaned but uncertain quantity is NOT invented',()=>{
 const t={page:1,headers:['TÜRÜ','BİRİM FİYAT','ADET','TUTAR'],rows:[
 ['İlan Giderleri Ücreti','250,00','10','# 250,00 B)'],
 ['TTSG İlan Ücreti','5,53|','345.0','# 1.907,85 b)'],
 ['Şube Açılış Harcı','35354,50)','1.0','# 35.354,50 B)']
 ],reportedTotal:'37.512,35'};
 const x=auditTable(t);
 assert.deepEqual(x.rows[0],['İlan Giderleri Ücreti','250,00','10','250,00']);
 assert.deepEqual(x.rows[1],['TTSG İlan Ücreti','5,53','345.0','1.907,85']);
 assert.deepEqual(x.rows[2],['Şube Açılış Harcı','35354,50','1.0','35.354,50']);
 assert.equal(x.issues.length,1);
 assert.equal(x.issues[0].row,0);
 assert.equal(x.issues[0].suggested,'1');
 assert.equal(moneyValue('rastgele sayı'),null);
});
test('report total is not exported as an extra detail line',()=>{
 const words=[];
 for(const [text,x,y] of [['TÜRÜ',30,100],['BİRİM',800,100],['FİYAT',860,100],['ADET',980,100],['TUTAR',1150,100],
 ['İlan',30,130],['250,00',830,130],['1.0',1000,130],['250,00',1190,130],
 ['Oda',30,160],['3305,00',830,160],['1.0',1000,160],['3.305,00',1190,160],
 ['YALNIZ',30,190],['TOPLAM',830,190],['3.555,00',1190,190]])words.push({text,bbox:{x0:x,y0:y,x1:x+45,y1:y+14}});
 const t=extractTables(ocrWordsToEntries(words));assert.equal(t.length,1);
 assert.equal(t[0].rows.length,2);
 assert.equal(t[0].reportedTotal,'3.555,00');
 assert.deepEqual(auditTable(t[0]).issues,[]);
});
