import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {createSearchablePdf} from '../Eklenti/export-pdf.mjs';

const fontPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'../Eklenti/vendor/NotoSans-Regular.ttf');
test('Türkçe karakterleri içeren görünmez PDF OCR katmanı üretilebilir', {skip:!fs.existsSync(fontPath)},async()=>{
  const original=await PDFDocument.create();
  original.addPage([595,842]);
  const source=await original.save();
  const previousFetch=globalThis.fetch, oldPDF=globalThis.PDFLib, oldFont=globalThis.fontkit, oldChrome=globalThis.chrome;
  globalThis.PDFLib={PDFDocument};
  globalThis.fontkit=fontkit;
  globalThis.chrome={runtime:{getURL:file=>file}};
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>{
    const b=fs.readFileSync(fontPath);
    return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
  }});
  try{
    const pages=[{index:1,textSource:'ocr',words:[{text:'Çeşme Şişli ıİğü',bbox:{x0:40,y0:50,x1:260,y1:72}}],viewport:{convertToPdfPoint:(x,y)=>[x,842-y]}}];
    const result=await createSearchablePdf(source,pages);
    assert.equal(result.count,1);
    assert.ok(result.bytes.length>source.length);
    const output=await PDFDocument.load(result.bytes);
    assert.equal(output.getPageCount(),1);
  }finally{
    globalThis.fetch=previousFetch;globalThis.PDFLib=oldPDF;globalThis.fontkit=oldFont;globalThis.chrome=oldChrome;
  }
});
