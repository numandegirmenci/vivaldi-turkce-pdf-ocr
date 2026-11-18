import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../Eklenti/whatsapp-page.js',import.meta.url),'utf8');
function harness(){
  const messages=[],handlers={};
  class Anchor { constructor(href,download=''){this.href=href;this.download=download;this.clicked=0;} click(){this.clicked++;} }
  const FakeURL={createObjectURL:()=> 'blob:https://web.whatsapp.com/abc'};
  const win={postMessage:(data)=>messages.push(data),addEventListener:(type,callback)=>{handlers[type]=callback;}};
  const ctx={window:win,URL:FakeURL,HTMLAnchorElement:Anchor,Blob,Date,Uint8Array,
    location:{origin:'https://web.whatsapp.com'},document:{querySelectorAll:()=>[]},
    fetch:async()=>{throw new Error('fetch not expected')},console,setTimeout,clearTimeout};
  vm.runInNewContext(source,ctx);
  const arm=(nonce='12345678-1234-1234-1234-123456789012')=>{
    handlers.message({source:win,origin:'https://web.whatsapp.com',
      data:{channel:'turkce-pdf-ocr-whatsapp-v1',type:'arm',nonce}});
    return nonce;
  };
  return {messages,arm,win,ctx,Anchor,handlers};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,25));

test('Yakalama etkin değilken PDF verisi veya sohbet okunmaz',async()=>{
  const h=harness();
  h.ctx.URL.createObjectURL(new Blob(['%PDF-1.7 local bytes'],{type:'application/pdf'}));
  await tick();
  assert.equal(h.messages.length,0);
});
test('WhatsApp PDF yalnız kullanıcı etkinleştirince bir kez gönderilir',async()=>{
  const h=harness(),id=h.arm();
  h.ctx.URL.createObjectURL(new Blob(['%PDF-1.7 local bytes'],{type:'application/pdf'}));
  await tick();
  assert.equal(h.messages.length,1);
  assert.equal(h.messages[0].nonce,id);
  assert.equal(h.messages[0].type,'pdf');
  assert.ok(h.messages[0].bytes.byteLength>5);
  h.ctx.URL.createObjectURL(new Blob(['%PDF-1.7 other bytes'],{type:'application/pdf'}));
  await tick();
  assert.equal(h.messages.length,1);
});
test('PDF olmayan veriler aktarılmaz ve iptal sonrası izlenmez',async()=>{
  const h=harness(),id=h.arm();
  h.ctx.URL.createObjectURL(new Blob(['not a PDF'],{type:'image/png'}));
  await tick();
  assert.equal(h.messages.length,0);
  h.handlers.message({source:h.win,origin:'https://web.whatsapp.com',
    data:{channel:'turkce-pdf-ocr-whatsapp-v1',type:'cancel',nonce:id}});
  h.ctx.URL.createObjectURL(new Blob(['%PDF-1.7 later'],{type:'application/pdf'}));
  await tick();
  assert.equal(h.messages.length,0);
});
test('Yabancı origin mesajı yakalamayı başlatamaz',async()=>{
  const h=harness();
  h.handlers.message({source:h.win,origin:'https://evil.example',
    data:{channel:'turkce-pdf-ocr-whatsapp-v1',type:'arm',nonce:'12345678-1234-1234-1234-123456789012'}});
  h.ctx.URL.createObjectURL(new Blob(['%PDF-1.7 later'],{type:'application/pdf'}));
  await tick();
  assert.equal(h.messages.length,0);
});
test('Geçici aktarım yalnız WhatsApp origin için kabul edilir',()=>{
  const bg=fs.readFileSync(new URL('../Eklenti/whatsapp-transfer.js',import.meta.url),'utf8');
  assert.match(bg,/web\.whatsapp\.com/);
  assert.match(bg,/isViewerSender/);
  assert.match(bg,/MAX_BYTES = 32 \* 1024 \* 1024/);
  assert.match(bg,/cleanupStale/);
});

test('Yeniden etkinleştirdikten sonra aynı PDF ikinci kez yakalanabilir',async()=>{
  const h=harness(),first=h.arm();
  const pdf=new Blob(['%PDF-1.7 first capture'],{type:'application/pdf'});
  h.ctx.URL.createObjectURL(pdf);
  await tick();
  assert.equal(h.messages.filter(x=>x.type==='pdf').length,1);
  const second='22345678-1234-1234-1234-123456789012';
  h.arm(second);
  h.ctx.URL.createObjectURL(pdf);
  await tick();
  const pdfs=h.messages.filter(x=>x.type==='pdf');
  assert.equal(pdfs.length,2);
  assert.equal(pdfs[0].nonce,first);
  assert.equal(pdfs[1].nonce,second);
});
test('Mevcut PDF blob bağlantısı native click gecikmeden açılır ve kopyalanır',async()=>{
  const h=harness();
  const blob=new Blob(['%PDF-1.7 cached link'],{type:'application/pdf'});
  h.ctx.fetch=async()=>({ok:true,blob:async()=>blob});
  h.arm();
  const link=new h.Anchor('blob:https://web.whatsapp.com/abc','evrak.pdf');
  link.click();
  assert.equal(link.clicked,1,'WhatsApp tıklaması engellenmemeli');
  await tick();
  assert.equal(h.messages.filter(x=>x.type==='pdf').length,1);
  assert.equal(h.messages.find(x=>x.type==='pdf').name,'evrak.pdf');
});
