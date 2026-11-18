import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../Eklenti/whatsapp-content.js',import.meta.url),'utf8');

function harness(){
  const runtimeCalls=[];
  const windowEvents={},posts=[];
  const elements=[];
  let uuid=0;
  const dom={createElement(tag){
    const el={tag,hidden:false,textContent:'',children:[],events:{},
      style:{},setAttribute(){},
      append(...children){this.children.push(...children);},
      attachShadow(){this.shadow={children:[],append(...children){this.children.push(...children);}};return this.shadow;},
      addEventListener(type,callback){this.events[type]=callback;}
    };
    elements.push(el);
    return el;
  },body:{append(){}}};
  const win={addEventListener(type,callback){windowEvents[type]=callback;},
    postMessage(msg){posts.push(msg);}};
  const crypto={randomUUID(){
    uuid++;
    return String(uuid).padStart(8,'0')+'-1111-1111-1111-111111111111';
  }};
  const chrome={runtime:{sendMessage:async msg=>{
    runtimeCalls.push(msg);
    return {ok:true};
  }}};
  let t=0;
  const timers=new Map();
  vm.runInNewContext(source,{window:win,document:dom,location:{hostname:'web.whatsapp.com',origin:'https://web.whatsapp.com'},
    crypto,chrome,Date,ArrayBuffer,Uint8Array,Number,String,Math,btoa,
    setTimeout:(fn)=>{const id=++t;timers.set(id,fn);return id;},
    clearTimeout:(id)=>timers.delete(id),
    console});
  const box=elements.find(x=>x.className==='box');
  const [button,reopen,message]=box.children;
  return {win,windowEvents,posts,button,reopen,message,runtimeCalls,timers,
    pdf(name='deneme.pdf'){
      const arm=posts.findLast(x=>x.type==='arm');
      const bytes=Uint8Array.from(Buffer.from('%PDF-1.7 sample')).buffer;
      return windowEvents.message({source:win,origin:'https://web.whatsapp.com',
        data:{channel:'turkce-pdf-ocr-whatsapp-v1',type:'pdf',nonce:arm.nonce,bytes,name}});
    }
  };
}

test('WhatsApp PDF kapatıldıktan sonra Son PDF ile ikinci kez açılır',async()=>{
  const h=harness();
  assert.equal(h.reopen.hidden,true);
  h.button.events.click();
  await h.pdf('ilk.pdf');
  assert.equal(h.reopen.hidden,false,'ilk başarılı aktarım son PDF butonunu açmalı');
  assert.equal(h.runtimeCalls.filter(x=>x.action==='waFinish').length,1);
  await h.reopen.events.click();
  assert.equal(h.runtimeCalls.filter(x=>x.action==='waFinish').length,2);
  assert.equal(h.runtimeCalls.filter(x=>x.action==='waStart').length,2);
  assert.equal(h.reopen.hidden,false,'ikinci açılıştan sonra da yeniden açma korunmalı');
});
test('Son PDF açıkken yeni bir PDF yakalamak mümkündür',async()=>{
  const h=harness();
  h.button.events.click();
  await h.pdf('ilk.pdf');
  h.button.events.click();
  await h.pdf('ikinci.pdf');
  assert.deepEqual(h.runtimeCalls.filter(x=>x.action==='waStart').map(x=>x.name),['ilk.pdf','ikinci.pdf']);
  await h.reopen.events.click();
  assert.deepEqual(h.runtimeCalls.filter(x=>x.action==='waStart').map(x=>x.name),['ilk.pdf','ikinci.pdf','ikinci.pdf']);
});
test('İptal edilen yakalama son PDF kopyasını silmez',async()=>{
  const h=harness();
  h.button.events.click();
  await h.pdf();
  h.button.events.click();
  h.button.events.click();
  assert.equal(h.reopen.hidden,false);
  await h.reopen.events.click();
  assert.equal(h.runtimeCalls.filter(x=>x.action==='waFinish').length,2);
});
