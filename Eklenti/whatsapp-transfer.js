// Temporary, per-tab IndexedDB transfer. Supported file magic is checked before accepting data.
(()=>{
  'use strict';
  const DB_NAME='turkce-pdf-ocr-whatsapp-temporary-v2';
  // Remove the previous version's temporary document chunks after upgrade.
  try { indexedDB.deleteDatabase('turkce-pdf-ocr-whatsapp-temporary-v1'); } catch {}
  const MAX_BYTES=32*1024*1024,CHUNK_SIZE=256*1024,MAX_AGE=10*60*1000;
  const ALARM='turkce-pdf-ocr-wa-cleanup';
  const KINDS=['pdf','png','jpeg','webp','gif','bmp','docx','xlsx','pptx','odt','text'];
  let connectionPromise;
  function openDb(){
    if(!connectionPromise)connectionPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{req.result.createObjectStore('sessions',{keyPath:'id'});req.result.createObjectStore('chunks',{keyPath:'key'});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    }).catch(e=>{connectionPromise=null;throw e;});
    return connectionPromise;
  }
  async function get(store,key){const db=await openDb();return new Promise((resolve,reject)=>{
    const req=db.transaction(store,'readonly').objectStore(store).get(key);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });}
  async function getAll(store){const db=await openDb();return new Promise((resolve,reject)=>{
    const req=db.transaction(store,'readonly').objectStore(store).getAll();
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });}
  async function put(store,value,add=false){const db=await openDb();return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');const req=tx.objectStore(store)[add?'add':'put'](value);
    tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}
  async function remove(id){const db=await openDb();return new Promise((resolve,reject)=>{
    const tx=db.transaction(['sessions','chunks'],'readwrite');
    tx.objectStore('sessions').delete(id);tx.objectStore('chunks').delete(IDBKeyRange.bound(id+':',id+':\uffff'));
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}
  async function cleanup(){for(const s of await getAll('sessions'))if(Date.now()-s.updatedAt>MAX_AGE)await remove(s.id);}
  function isWA(sender){try{return new URL(sender.url||sender.origin).origin==='https://web.whatsapp.com';}catch{return false;}}
  function isViewer(sender){try{const u=new URL(sender.url||''),v=new URL(chrome.runtime.getURL('viewer.html'));
    return u.origin===v.origin&&u.pathname===v.pathname;}catch{return false;}}
  function validId(id){return typeof id==='string'&&/^[a-f0-9-]{20,80}$/i.test(id);}
  function sameSender(s,sender){return s.sourceTab===(sender.tab?.id??null)&&(!s.documentId||!sender.documentId||s.documentId===sender.documentId);}
  function fromBase64(value){if(typeof value!=='string'||value.length>Math.ceil(CHUNK_SIZE/3)*4+12)throw new Error('Aktarım paketi büyük.');
    const raw=atob(value),result=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)result[i]=raw.charCodeAt(i);return result;}
  function asBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);}
  function verifyHeader(bytes,kind){
    const b=bytes,s=(i,n)=>String.fromCharCode(...b.slice(i,i+n));
    switch(kind){
      case 'pdf':return s(0,5)==='%PDF-';
      case 'png':return b[0]===137&&s(1,3)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
      case 'jpeg':return b[0]===255&&b[1]===216&&b[2]===255;
      case 'webp':return s(0,4)==='RIFF'&&s(8,4)==='WEBP';
      case 'gif':return ['GIF87a','GIF89a'].includes(s(0,6));
      case 'bmp':return s(0,2)==='BM';
      case 'docx':case 'xlsx':case 'pptx':case 'odt':return s(0,4)==='PK\x03\x04';
      case 'text':return bytes.length>0&&!bytes.slice(0,Math.min(64,bytes.length)).includes(0);
      default:return false;
    }
  }
  async function handle(msg,sender){
    const action=msg.action,fromWA=isWA(sender),fromViewer=isViewer(sender);
    if(!validId(msg.id))throw new Error('Aktarım kimliği geçersiz.');const id=msg.id;
    if(action==='waStart'){
      if(!fromWA)throw new Error('Yalnızca WhatsApp Web destekleniyor.');
      const size=Number(msg.size),kind=String(msg.kind||(/\.pdf$/i.test(String(msg.name||''))?'pdf':''));
      if(!Number.isSafeInteger(size)||size<1||size>MAX_BYTES||!KINDS.includes(kind))throw new Error('Dosya türü veya boyutu geçersiz.');
      await cleanup();if(await get('sessions',id))throw new Error('Aktarım zaten var.');
      const name=String(msg.name||'WhatsApp').split(/[\\/]/).pop().slice(0,180);
      await put('sessions',{id,size,name,kind,mime:String(msg.mime||'').slice(0,120),
        sourceTab:sender.tab?.id??null,documentId:sender.documentId||null,updatedAt:Date.now(),
        count:Math.ceil(size/CHUNK_SIZE),received:0,parts:0,ready:false},true);
      try{chrome.alarms.create(ALARM,{periodInMinutes:10});}catch{}
      return {ok:true};
    }
    if(action==='waCancel'||action==='waDispose'){
      if((action==='waCancel'&&!fromWA)||(action==='waDispose'&&!fromViewer))throw new Error('Kaynak doğrulanamadı.');
      const s=await get('sessions',id);if(s&&(fromViewer||sameSender(s,sender)))await remove(id);
      return {ok:true};
    }
    const s=await get('sessions',id);if(!s)throw new Error('Aktarım bulunamadı veya süresi doldu.');
    if(action==='waChunk'||action==='waFinish'){
      if(!fromWA||!sameSender(s,sender))throw new Error('WhatsApp oturumu doğrulanamadı.');
      if(s.ready)throw new Error('Aktarım tamamlandı.');
      if(action==='waChunk'){
        const index=Number(msg.index);
        if(!Number.isSafeInteger(index)||index<0||index>=s.count||index!==s.parts)throw new Error('Parça sırası geçersiz.');
        const bytes=fromBase64(msg.base64),expected=Math.min(CHUNK_SIZE,s.size-index*CHUNK_SIZE);
        if(bytes.length!==expected)throw new Error('Parça boyutu geçersiz.');
        if(index===0&&!verifyHeader(bytes,s.kind))throw new Error('Dosya imzası ile türü eşleşmiyor.');
        await put('chunks',{key:id+':'+index,bytes});
        s.parts++;s.received+=bytes.length;s.updatedAt=Date.now();await put('sessions',s);return {ok:true};
      }
      if(s.parts!==s.count||s.received!==s.size)throw new Error('Dosya parçaları eksik.');
      s.ready=true;await put('sessions',s);
      const tab=await chrome.tabs.create({url:chrome.runtime.getURL('viewer.html')+'?wa='+encodeURIComponent(id),active:true});
      return {ok:true,tabId:tab.id};
    }
    if(!fromViewer)throw new Error('PDF görüntüleyici doğrulanamadı.');
    if(!s.ready)throw new Error('Dosya henüz hazırlanmadı.');
    if(action==='waMeta')return {ok:true,size:s.size,name:s.name,count:s.count,kind:s.kind,mime:s.mime};
    if(action==='waReadChunk'){
      const index=Number(msg.index);
      if(!Number.isSafeInteger(index)||index<0||index>=s.count)throw new Error('Parça numarası geçersiz.');
      const item=await get('chunks',id+':'+index);if(!item)throw new Error('Dosya parçası eksik.');
      return {ok:true,base64:asBase64(item.bytes)};
    }
    throw new Error('Bilinmeyen aktarım komutu.');
  }
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
    if(!msg||typeof msg.action!=='string'||!msg.action.startsWith('wa'))return false;
    handle(msg,sender).then(reply).catch(e=>reply({ok:false,error:String(e?.message||e)}));return true;
  });
  chrome.alarms?.onAlarm?.addListener(a=>{if(a.name===ALARM)void cleanup().catch(e=>console.warn('Geçici dosya temizleme:',e));});
})();
