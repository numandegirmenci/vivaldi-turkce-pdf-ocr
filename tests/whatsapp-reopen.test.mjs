import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../Eklenti/whatsapp-content.js',import.meta.url),'utf8');
test('previous files cache includes up to five entries and can reopen chosen document',()=>{
 assert.match(src,/HISTORY_ITEMS\s*=\s*5/);
 assert.match(src,/recentFiles\.unshift/);assert.match(src,/recentFiles\.findIndex/);
 assert.match(src,/openCached\(file\)/);assert.match(src,/await transfer\(file\.bytes,file\.name/);
});
test('whatsapp capture requires explicit activation and supports cancel',()=>{
 assert.match(src,/type:'arm'|type:\s*'arm'/);
 assert.match(src,/type:'cancel'|type:\s*'cancel'/);
 assert.match(src,/captureVisible/);
});

test('toolbar controls arm and cancel capture without injecting UI into the chat',async()=>{
 const vm=await import('node:vm');
 const sent=[];
 let listener;
 const origin='https://web.whatsapp.com';
 const window={addEventListener(){},postMessage(message,target){sent.push({message,target});}};
 vm.runInNewContext(src,{
   window,location:{hostname:'web.whatsapp.com',origin},
   crypto:{randomUUID:()=> 'fixture-id'},
   chrome:{runtime:{id:'extension-id',onMessage:{addListener(fn){listener=fn;}}}}
 });
 const command=name=>new Promise(resolve=>{
   assert.equal(listener({action:'whatsappControl',command:name},{id:'extension-id'},resolve),true);
 });
 assert.equal((await command('state')).armed,false);
 assert.equal(sent.length,0);
 assert.equal((await command('toggle')).armed,true);
 await command('captureVisible');
 assert.equal((await command('toggle')).armed,false);
 assert.deepEqual(sent.map(entry=>entry.message.type),['arm','captureVisible','cancel']);
 assert.ok(sent.every(entry=>entry.target===origin));
});
