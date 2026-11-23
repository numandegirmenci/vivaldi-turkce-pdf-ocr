import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const script=fs.readFileSync(new URL('../Eklenti/attachment-capture.js',import.meta.url),'utf8');
function setup(body,contentType='application/pdf'){
  const messages=[];
  const context=vm.createContext({
    URL, Uint8Array, String, Number, Math, decodeURIComponent, btoa, console,
    document:{contentType:'text/html',querySelectorAll:()=>[]},
    location:{href:'https://outlook.office.com/mail/'},
    fetch:async()=>new Response(body,{headers:{'content-type':contentType}}),
    chrome:{runtime:{sendMessage:async message=>{messages.push(message);return {ok:true};}}}
  });
  vm.runInContext(script,context);
  return {context,messages};
}
test('Outlook görüntü ekinin PNG baytları geçici aktarıma alınır',async()=>{
  const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0]);
  const {context,messages}=setup(png,'image/png');
  const result=await vm.runInContext(
    "captureOcrAttachment({id:'12345678-1234-1234-1234-123456789012',sourceUrl:'https://outlook.office.com/attachment/preview'})",
    context);
  assert.equal(result.ok,true);
  assert.deepEqual(messages.map(x=>x.action),['ctxStart','ctxChunk','ctxFinish']);
  assert.equal(messages[0].kind,'png');
  assert.equal(Buffer.from(messages[1].base64,'base64').compare(png),0);
});
test('OneDrive yalnız HTML önizleme veriyorsa PDF sanılmaz',async()=>{
  const {context,messages}=setup('<html><body>OneDrive</body></html>','text/html');
  const result=await vm.runInContext(
    "captureOcrAttachment({id:'12345678-1234-1234-1234-123456789012',sourceUrl:'https://onedrive.live.com/view.aspx?id=123'})",
    context);
  assert.equal(result.ok,false);
  assert.match(result.error,/önizleme HTML/);
  assert.equal(messages.length,0);
});
