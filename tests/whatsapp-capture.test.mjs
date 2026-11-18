import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../Eklenti/whatsapp-page.js',import.meta.url),'utf8');
const nonce='11111111-1111-4111-8111-111111111111',origin='https://web.whatsapp.com';
const wait=()=>new Promise(r=>setTimeout(r,60));
function mock(){
 const handlers={},domHandlers={},out=[];let preview=[],counter=0,fetchCount=0;
 const window={addEventListener(t,f){handlers[t]=f;},postMessage(m,loc,transfers){out.push(transfers?.length?structuredClone(m,{transfer:transfers}):m);},open(){}};
 const URL={createObjectURL(){return 'blob:'+origin+'/'+(++counter);}};
 const document={documentElement:{},addEventListener(t,f){domHandlers[t]=f;},querySelectorAll(){return preview.map(url=>({src:url,tagName:'EMBED',getClientRects:()=>[{}],getBoundingClientRect:()=>({width:800,height:700})}));}};
 class Anchor{click(){}}
 class MutationObserver{observe(){}disconnect(){}}
 vm.runInNewContext(code,{window,URL,HTMLAnchorElement:Anchor,document,location:{origin},Blob,Uint8Array,ArrayBuffer,Date,
   setTimeout:(f,ms)=>{const id=setTimeout(f,ms);id.unref();return id;},clearTimeout,MutationObserver,
   fetch:async()=>{fetchCount++;throw new Error('URL revoked');}});
 const message=(type)=>handlers.message({source:window,origin,data:{type,nonce,channel:'turkce-pdf-ocr-whatsapp-v1'}});
 const click=(label,opts={})=>domHandlers.click({isTrusted:true,target:{nodeType:1,getAttribute(k){return k==='aria-label'?label:'';},
  closest(selector){if(opts.extension)return null;if(selector.includes('[aria-label*="PDF"]')&&label.includes('PDF'))return this;
   if(selector.includes('a[href^="blob:"]'))return null;
   if(selector.includes('[role="button"]')&&opts.button)return {textContent:label};return null;}},
  composedPath:()=>opts.extension?[{id:'turkce-pdf-ocr-whatsapp-control'}]:[]});
 return {out,window,URL,message,click,setPreview:urls=>{preview=urls;},getFetch:()=>fetchCount};
}
const files=a=>a.out.filter(m=>m.type==='file');
test('arming without a document click launches zero captures',async()=>{
 const a=mock();a.message('arm');a.click('');a.click('sohbet');a.click('',{extension:true});
 a.URL.createObjectURL(new Blob(['%PDF-1.7 unwanted'],{type:'application/pdf'}));
 await wait();assert.equal(files(a).length,0);
});
test('document A, B, A repeated cached URL: one capture per interaction',async()=>{
 const a=mock();a.message('arm');a.click('PDF belge');
 const urlA=a.URL.createObjectURL(new Blob(['%PDF-1.7 first'],{type:'application/pdf'}));await wait();
 assert.equal(files(a).length,1);a.message('ack');
 a.click('sohbet');a.setPreview([urlA]);await wait();assert.equal(files(a).length,1);
 a.setPreview([]);a.click('PDF ikinci');a.URL.createObjectURL(new Blob(['%PDF-1.7 second'],{type:'application/pdf'}));
 await wait();assert.equal(files(a).length,2);a.message('ack');
 a.setPreview([urlA]);a.click('PDF ilk');await new Promise(resolve=>setTimeout(resolve,170));
 assert.equal(files(a).length,3);assert.equal(new TextDecoder().decode(files(a)[2].bytes),'%PDF-1.7 first');
 assert.equal(a.getFetch(),0);
});
test('multiple visible previews never spawn many tabs on manual capture',async()=>{
 const a=mock();a.message('arm');a.setPreview(['blob:'+origin+'/A','blob:'+origin+'/B']);a.message('captureVisible');
 await wait();assert.equal(files(a).length,0);
 assert.match(a.out.find(x=>x.type==='error')?.message||'',/Birden fazla/);
});
