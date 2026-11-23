import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {createEditedPdf} from '../Eklenti/export-pdf.mjs';

const fontPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'../Eklenti/vendor/NotoSans-Regular.ttf');
const patch='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP89evXfwYGBgYmBigAAD0IA/GtclJYAAAAAElFTkSuQmCC';
test('PDF çıktısı önizlemedeki raster düzeltmeyi ve yeni aranabilir metni içerir',
  {skip:!fs.existsSync(fontPath)},async()=>{
  const original=await PDFDocument.create();original.addPage([595,842]);
  const previousFetch=globalThis.fetch,previousLib=globalThis.PDFLib,
    previousKit=globalThis.fontkit,previousChrome=globalThis.chrome;
  globalThis.PDFLib={PDFDocument,rgb};
  globalThis.fontkit=fontkit;
  globalThis.chrome={runtime:{getURL:filename=>filename}};
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>{
    const b=fs.readFileSync(fontPath);
    return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
  }});
  try{
    const box={x0:374,y0:260,x1:690,y1:322};
    const views=[{index:1,width:595,height:842,textSource:'ocr',
      rotation:0,page:{rotate:0},words:[
        {text:'Eski',bbox:box},{text:'Belediye',bbox:{x0:20,y0:260,x1:140,y1:322}}],
      viewport:{convertToPdfPoint:(x,y)=>[x,842-y]},
      edits:[{id:'test-raster',text:'BAŞKANLIĞI',original:'Eski',sourceKind:'ocr',
        sourceIndex:0,sourceIndices:[0],fontSize:57,ink:'#101010',fill:'#fafafa',
        box,patchPng:patch}]}];
    const output=await createEditedPdf(await original.save(),views);
    const pdf=await PDFDocument.load(output.bytes);
    assert.equal(output.count,1);
    assert.ok(pdf.getPageCount()===1);
    const page=pdf.getPage(0);
    assert.ok(page.node.Resources().lookupMaybe,'PDF resource lookup usable');
    const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc=await pdfjs.getDocument({data:Uint8Array.from(output.bytes)}).promise;
    try{
      const p=await doc.getPage(1);
      const text=(await p.getTextContent()).items.map(i=>i.str).join(' ');
      assert.match(text,/BAŞKANLIĞI/,'new correction must remain PDF-searchable');
      assert.doesNotMatch(text,/Eski/,'old invisible OCR word must be excluded');
      const ops=await p.getOperatorList();
      assert.ok(ops.fnArray.some(op=>[pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintImageXObjectRepeat].includes(op)),
        'PNG patch must be embedded as an image in the PDF');
    }finally{await doc.destroy();}
  }finally{
    globalThis.fetch=previousFetch;globalThis.PDFLib=previousLib;
    globalThis.fontkit=previousKit;globalThis.chrome=previousChrome;
  }
});
