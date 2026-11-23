import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function makeBackground() {
  const listeners = {};
  const updates = [];
  const chrome = {
    storage: { local: { get: async () => ({autoOpen:true}) } },
    runtime: { getURL: path => `chrome-extension://testid/${path}`, onMessage: { addListener: fn => listeners.message=fn } },
    tabs: {
      onUpdated: { addListener: fn => listeners.updated=fn },
      onRemoved: { addListener: fn => listeners.removed=fn },
      create: async options => { updates.push({tabId:20,url:options.url}); return {id:20}; },
      update: async (tabId, options) => { updates.push({tabId,url:options.url}); listeners.updated(tabId, {url:options.url}); },
    },
    webRequest: { onHeadersReceived: { addListener: fn => listeners.headers=fn } },
  };
  const source=fs.readFileSync(new URL('../Eklenti/background.js',import.meta.url),'utf8');
  vm.runInNewContext(source,{chrome,URL,Map,Date,decodeURIComponent,console,Number,encodeURIComponent});
  return {listeners,updates};
}

test('normal PDF adresi otomatik PDF OCR görüntüleyicisine yönlendirilir',async()=>{
  const {listeners,updates}=makeBackground();
  listeners.updated(1,{url:'https://example.org/evrak.pdf'});
  await new Promise(resolve => setTimeout(resolve,10));
  assert.equal(updates.length,1);
  assert.match(updates[0].url,/chrome-extension:\/\/testid\/viewer\.html\?src=/);
});

test('Orijinal PDF açılırken 302 ve içerik türü yeniden yönlendirme yapmaz', async()=>{
  const {listeners,updates}=makeBackground();
  const response=await new Promise(resolve => listeners.message(
    {action:'openOriginal',url:'https://example.org/dosya.pdf'}, {}, resolve));
  assert.equal(response.ok,true);
  listeners.headers({tabId:20,url:'https://example.org/redirect.pdf', responseHeaders:[{name:'Content-Type',value:'application/pdf'}]});
  await new Promise(resolve => setTimeout(resolve,10));
  assert.deepEqual(updates.map(x=>x.url), ['about:blank','https://example.org/dosya.pdf']);
});

test('doğrudan açılan JPEG ve PNG ekleri de yerel OCR ekranına yönlenir',async()=>{
  const {listeners,updates}=makeBackground();
  listeners.updated(1,{url:'https://outlook.example/attachment.JPG?download=1'});
  await new Promise(resolve => setTimeout(resolve,10));
  assert.equal(updates.length,1);
  assert.match(updates[0].url,/viewer\.html\?src=/);
});
test('görsel MIME yanıtı yalnız ana çerçevede yakalanır',async()=>{
  const {listeners,updates}=makeBackground();
  listeners.headers({tabId:4,url:'https://example.org/attachment?id=5',responseHeaders:[{name:'Content-Type',value:'image/png'}]});
  await new Promise(resolve => setTimeout(resolve,10));
  assert.equal(updates.length,1);
});
