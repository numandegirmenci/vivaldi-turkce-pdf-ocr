import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {createEditedPdf} from '../Eklenti/export-pdf.mjs';

const fontPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'../Eklenti/vendor/NotoSans-Regular.ttf');
test('taranan PDF üzerindeki OCR kelimesi görünür Türkçe yazıya dönüştürülür',
  {skip:!fs.existsSync(fontPath)},async()=>{
    const original=await PDFDocument.create();
    original.addPage([595,842]);
    const source=await original.save();
    const previousFetch=globalThis.fetch,oldPDF=globalThis.PDFLib,oldFont=globalThis.fontkit,oldChrome=globalThis.chrome;
    globalThis.PDFLib={PDFDocument,rgb};
    globalThis.fontkit=fontkit;
    globalThis.chrome={runtime:{getURL:file=>file}};
    globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>{
      const b=fs.readFileSync(fontPath);
      return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
    }});
    try{
      const box={x0:40,y0:60,x1:195,y1:87};
      const view={
        index:1,width:595,height:842,page:{rotate:0},rotation:0,
        textSource:'ocr',words:[
          {text:'ESKİ',bbox:box},
          {text:'Metin',bbox:{x0:210,y0:60,x1:275,y1:87}}
        ],
        viewport:{convertToPdfPoint:(x,y)=>[x,842-y]},
        edits:[{id:'test',text:'Çeşme İZMİR',original:'ESKİ',sourceKind:'ocr',
          sourceIndex:0,sourceIndices:[0],fontSize:19,ink:'#172b3d',fill:'#ffffff',box}]
      };
      const result=await createEditedPdf(source,[view]);
      assert.equal(result.count,1);
      const saved=await PDFDocument.load(result.bytes);
      assert.equal(saved.getPageCount(),1);
      assert.ok(result.bytes.length>source.length);
      const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
      const reader=await pdfjs.getDocument({data:Uint8Array.from(result.bytes)}).promise;
      try{
        const text=(await (await reader.getPage(1)).getTextContent()).items.map(item=>item.str).join(' ');
        assert.match(text,/Çeşme İZMİR/);
        assert.match(text,/Metin/);
        assert.doesNotMatch(text,/ESKİ/,'eski görünmez OCR katmanı geri gelmemeli');
      }finally{await reader.destroy();}
    }finally{
      globalThis.fetch=previousFetch;globalThis.PDFLib=oldPDF;globalThis.fontkit=oldFont;globalThis.chrome=oldChrome;
    }
});
