import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';

const code=fs.readFileSync(new URL('../Eklenti/whatsapp-transfer.js',import.meta.url),'utf8');

function setup(){
  const listeners={}, tabs=[];
  const chrome={
    runtime:{
      getURL:path=>'chrome-extension://testid/'+path,
      onMessage:{addListener:fn=>{listeners.message=fn;}},
    },
    tabs:{create:async options=>{tabs.push(options);return {id:42};}},
    alarms:{create:()=>{},onAlarm:{addListener:fn=>{listeners.alarm=fn;}}},
  };
  const context={indexedDB,IDBKeyRange,chrome,Date,Uint8Array,URL,Number,
    String,Math,atob,btoa,console};
  vm.runInNewContext(code,context);
  const wa={url:'https://web.whatsapp.com/',tab:{id:10},documentId:'waframe'};
  const viewer={url:'chrome-extension://testid/viewer.html?wa=test'};
  const send=(action,props={},sender=wa)=>new Promise((resolve,reject)=>{
    try {
      const returned=listeners.message({action,...props},sender,resolve);
      if(returned!==true)reject(new Error('background handler did not respond'));
    }catch(error){reject(error);}
  });
  return {send,wa,viewer,tabs,listeners,permit:context.__ocrPermitContext};
}
const id='12345678-1234-1234-1234-123456789012';
const raw=Buffer.from('%PDF-1.7\nhello WhatsApp');
test('WhatsApp PDF aktarımı imza, origin ve bütünlük kontrollü çalışır',async()=>{
  const x=setup();
  assert.equal((await x.send('waStart',{id,size:raw.length,name:'belge.pdf'},{url:'https://evil.example'})).ok,false);
  assert.equal((await x.send('waStart',{id,size:raw.length,name:'belge.pdf'})).ok,true);
  assert.equal((await x.send('waFinish',{id})).ok,false,'tüm parçalar gelmeden PDF açılmamalı');
  assert.equal((await x.send('waChunk',{id,index:0,base64:raw.toString('base64')})).ok,true);
  const finished=await x.send('waFinish',{id});
  assert.equal(finished.ok,true);
  assert.match(x.tabs[0].url,/viewer\.html\?wa=/);
  const meta=await x.send('waMeta',{id},x.viewer);
  assert.equal(meta.ok,true);
  assert.equal(meta.name,'belge.pdf');
  const part=await x.send('waReadChunk',{id,index:0},x.viewer);
  assert.equal(Buffer.from(part.base64,'base64').toString(),raw.toString());
  assert.equal((await x.send('waDispose',{id},x.viewer)).ok,true);
  assert.equal((await x.send('waMeta',{id},x.viewer)).ok,false);
});
test('Sahte PDF imzası ve başka WhatsApp sekmesinin parçaları reddedilir',async()=>{
  const x=setup(),id2='22345678-1234-1234-1234-123456789012';
  assert.equal((await x.send('waStart',{id:id2,size:raw.length,name:'bilgi.pdf'})).ok,true);
  assert.equal((await x.send('waChunk',{id:id2,index:0,base64:raw.toString('base64')},{url:x.wa.url,tab:{id:11}})).ok,false);
  assert.equal((await x.send('waChunk',{id:id2,index:0,base64:Buffer.from('HELLO'+raw.toString().slice(5)).toString('base64')})).ok,false);
  assert.equal((await x.send('waCancel',{id:id2})).ok,true);
});

test('OneDrive/Outlook aktarımı yalnız kullanıcının açtığı sekme ve çerçevede başlar',async()=>{
  const x=setup(), id3='32345678-1234-1234-1234-123456789012';
  const outlook={url:'https://outlook.office.com/mail/',tab:{id:14},frameId:0,documentId:'mail'};
  const otherFrame={...outlook,frameId:1};
  const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const data={id:id3,size:png.length,name:'attachment.png',kind:'png',mime:'image/png'};
  assert.equal((await x.send('ctxStart',data,outlook)).ok,false,'Kullanıcı onayı olmadan aktarım başlamamalı');
  x.permit(id3,14,0);
  assert.equal((await x.send('ctxStart',data,otherFrame)).ok,false,'Başka çerçeve kullanamamalı');
  x.permit(id3,14,0);
  assert.equal((await x.send('ctxStart',data,outlook)).ok,true);
  assert.equal((await x.send('ctxChunk',{id:id3,index:0,base64:png.toString('base64')},otherFrame)).ok,false);
  assert.equal((await x.send('ctxChunk',{id:id3,index:0,base64:png.toString('base64')},outlook)).ok,true);
  assert.equal((await x.send('ctxFinish',{id:id3},outlook)).ok,true);
  assert.equal((await x.send('waMeta',{id:id3},x.viewer)).kind,'png');
  assert.equal((await x.send('waDispose',{id:id3},x.viewer)).ok,true);
});
