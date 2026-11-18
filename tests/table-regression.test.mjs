import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFieldTables,extractTables,extractedTablesFromSheets,ocrWordsToEntries,
  pdfTextToEntries,auditTable,tablesToTsv } from '../Eklenti/table-extract.mjs';

const words=[];
function put(text,x,y,w=120,h=13){words.push({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+h}});}
// Screenshot 1: two unrelated sections on same page, one boxed metadata at top-right.
put('SİCİL NO',45,200,85);put(':',165,200,5);
put('UNVAN',45,229,70);put(':',165,229,5);put('ÖRNEK İÇ VE DIŞ TİCARET ANONİM ŞİRKETİ',185,229,500);
const right=[
 ['Tarih / Saat','5.11.2026 / 13:40:15'],['Tahakkuk No','35909517'],
 ['Talep No','9480528'],['Birim','MALTEPE'],['Tahakkuk Tipi','ANA TAHAKKUK']
];
right.forEach(([a,b],i)=>{put(a,880,199+i*29,149);put(':',1048,199+i*29,7);put(b,1060,199+i*29,205);});
const heads=[['TÜRÜ',45],['BİRİM',801],['FİYAT',870],['ADET',985],['TUTAR',1165]];
heads.forEach(([s,x])=>put(s,x,426,s==='TÜRÜ'?60:45));
const feeRows=[['İlan Giderleri Ücreti','250,00','1.0','# 250,00 ₺'],
 ['TTSG İlan Ücreti','5,53','345.0','# 1.907,85 ₺'],
 ['Oda Kayıt Ücreti','3305,00','1.0','# 3.305,00 ₺'],
 ['Şube Açılış Harcı','35354,50','1.0','# 35.354,50 ₺'],
 ['Sicil Tasdiknamesi Harcı','895,80','1.0','# 895,80 ₺'],
 ['Temsilci Harcı','8598,80','1.0','# 8.598,80 ₺']];
feeRows.forEach((parts,i)=>parts.forEach((s,k)=>put(s,[45,901,1040,1190][k],458+i*31,k===0?510:90)));
put('YALNIZ',45,647);put('TOPLAM',995,647);put('50.311,95',1190,647);

test('first screenshot: 2 tables, separate top-right document metadata and 4-column fee table',()=>{
 const entries=ocrWordsToEntries(words);
 const sheets=[{index:1,textSource:'ocr',words}];
 const out=extractedTablesFromSheets(sheets);
 assert.equal(out.length,2,JSON.stringify(out,null,2));
 assert.equal(out[0].kind,'fields');
 assert.deepEqual(out[0].rows,right);
 assert.equal(out[1].kind,'fee');
 assert.equal(out[1].rows.length,6);
 assert.equal(auditTable(out[0]).issues.length,0);
 assert.match(tablesToTsv(out),/Tahakkuk No\t35909517/);
});

const second=[];
function add2(text,x,y,w=120){second.push({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+13}});}
const left=[
 ['KURUM ADI','İTO TİCARET SİCİLİ ÖDEME'],
 ['ABONE NO','—'], // empty value is represented visually by dash; exclude this example
 ['FATURA NO','6719083'],
 ['FATURA DÖNEMİ','2026-11'],
 ['FATURA TUTARI','50.311,95'],
 ['SON ÖDEME TARİHİ','05/11/2026'],
 ['ÖDENEN HESAP/IBAN, KARTNO','23437345/IBAN:TR000000000000000000000000'],
 ['DÖVİZ CİNSİ','TL'],
 ['ÖDENEN TUTAR','-50.311,95'],
 ['ARACILIK ÜCRETİ','0,00']
];
left.forEach(([a,b],i)=>{const y=38+i*24; add2(a,40,y,260);add2(':',304,y,4);add2(b,320,y,390);});
const rfields=[['BSMV','0,00'],['ÖDENEN TOPLAM TUTAR','-50.311,95']];
rfields.forEach(([a,b],i)=>{const y=255+i*24; add2(a,745,y,244);add2(':',1009,y,4);add2(b,1026,y,190);});
add2('AÇIKLAMA',40,347,100);add2(':',303,347,6);add2('İTO 35909517 ÖRNEK İÇ VE DIŞ TİCARET A.Ş.',320,347,430);

test('second screenshot: detect headerless accounting forms even without a TÜRÜ/price row',()=>{
 const entries=ocrWordsToEntries(second);
 assert.equal(extractTables(entries).length,0);
 const out=extractFieldTables(entries);
 assert.ok(out.length>=1,JSON.stringify(out,null,2));
 const combined=out.flatMap(t=>t.rows);
 assert.ok(combined.some(r=>r[0]==='Fatura No'&&r[1]==='6719083'));
 assert.ok(combined.some(r=>r[0]==='Fatura Tutarı'&&r[1]==='50.311,95'));
 assert.ok(combined.some(r=>r[0]==='Ödenen Toplam Tutar'&&r[1]==='-50.311,95'));
 assert.ok(!out.some(t=>t.title.includes('Ücret ve tutar')));
 assert.deepEqual(auditTable(out[0]).issues,[]);
});

test('not a table: generic prose, unlabeled isolated numbers, lone unvan',()=>{
 const entries=ocrWordsToEntries([
 {text:'Bu belge veri içerir',bbox:{x0:30,y0:30,x1:200,y1:45}},
 {text:'Havale dekontu güncelleme',bbox:{x0:30,y0:60,x1:210,y1:75}},
 {text:'1000',bbox:{x0:300,y0:60,x1:340,y1:75}},
 {text:'UNVAN',bbox:{x0:30,y0:100,x1:100,y1:115}},
 {text:':',bbox:{x0:110,y0:100,x1:113,y1:115}},
 {text:'Grup A',bbox:{x0:140,y0:100,x1:200,y1:115}}
 ]);
 assert.equal(extractFieldTables(entries).length,0);
});

test('native PDF one-item-per-line colon fields work',()=>{
 const content={items:[
 {str:'KURUM ADI   : İTO TİCARET',width:320,height:12,transform:[1,0,0,1,35,35]},
 {str:'FATURA NO   : 6719083',width:280,height:12,transform:[1,0,0,1,35,60]},
 {str:'FATURA DÖNEMİ   : 2026-11',width:330,height:12,transform:[1,0,0,1,35,85]}
 ]};
 const rows=extractFieldTables(pdfTextToEntries(content,{scale:1,convertToViewportPoint:(x,y)=>[x,y]}));
 assert.equal(rows.length,1,JSON.stringify(rows,null,2));
 assert.equal(rows[0].rows.length,3);
});
