import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('Eklenti/viewer.js');
const html=read('Eklenti/viewer.html');
const tools=read('Eklenti/viewer-tools.mjs');
const exportPdf=read('Eklenti/export-pdf.mjs');

test('100+ sayfa belge için lazy canvas ve sınırlı bellek mevcut',()=>{
  assert.match(source,/new IntersectionObserver/);
  assert.match(source,/maxCanvases:8/);
  assert.match(source,/function releaseCanvas\(/);
  assert.match(source,/async function renderPage\(/);
});
test('OCR seçim modu, PDF yazısı koruma ve tablo çıkarımı var',()=>{
  assert.match(source,/hasUsablePdfText\(view.nativeContent\)/);
  assert.match(source,/formatOcrWords\(words\)/);
  assert.match(source,/tessedit_pageseg_mode/);
  assert.match(html,/id="ocrQuality"/);
});
test('Arama, sayfa numarası, klavye ve PDF export kontrolleri mevcut',()=>{
  for(const id of ['searchInput','searchNext','searchPrevious','searchAll','copyTable','exportPdf','scanAll','pageNumber']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(tools,/key\.toLowerCase\(\)==='f'/);
  assert.match(exportPdf,/registerFontkit/);
  assert.match(exportPdf,/opacity:0/);
  assert.match(source,/sourceBytes=converted\.bytes/);
});
test('Paket Windows güncelleme dosyalarını içerir',()=>{
  const workflow=read('.github/workflows/release.yml');
  assert.match(workflow,/KOLAY_GUNCELLE\.cmd KOLAY_GUNCELLE\.ps1/);
});
