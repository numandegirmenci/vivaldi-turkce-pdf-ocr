// MV3 service-worker transfer: temporary IndexedDB chunks; no remote upload or chat access.
(() => {
  'use strict';
  const DB_NAME = 'turkce-pdf-ocr-whatsapp-temporary-v1';
  const MAX_BYTES = 32 * 1024 * 1024;
  const CHUNK_SIZE = 256 * 1024; // Fewer MV3 messages for faster PDFs
  const MAX_AGE = 10 * 60 * 1000;
  const ALARM_NAME = 'turkce-pdf-ocr-wa-cleanup';
  let connectionPromise;

  function openDb() {
    if (!connectionPromise) {
      connectionPromise = new Promise((resolve,reject) => {
        const request = indexedDB.open(DB_NAME,1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('sessions',{keyPath:'id'});
          request.result.createObjectStore('chunks',{keyPath:'key'});
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(error => { connectionPromise=null;throw error; });
    }
    return connectionPromise;
  }
  async function get(store,key) {
    const db=await openDb();
    return new Promise((resolve,reject) => {
      const req=db.transaction(store,'readonly').objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function getAll(store) {
    const db=await openDb();
    return new Promise((resolve,reject) => {
      const req=db.transaction(store,'readonly').objectStore(store).getAll();
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function put(store,value,add=false) {
    const db=await openDb();
    return new Promise((resolve,reject) => {
      const tx=db.transaction(store,'readwrite');
      const req=tx.objectStore(store)[add?'add':'put'](value);
      tx.oncomplete=()=>resolve(req.result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }
  async function remove(id) {
    const db=await openDb();
    return new Promise((resolve,reject) => {
      const tx=db.transaction(['sessions','chunks'],'readwrite');
      tx.objectStore('sessions').delete(id);
      tx.objectStore('chunks').delete(IDBKeyRange.bound(id+':',id+':\uffff'));
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }
  async function cleanupStale() {
    for (const session of await getAll('sessions')) {
      if (Date.now()-session.updatedAt > MAX_AGE) await remove(session.id);
    }
  }
  function isWhatsappSender(sender) {
    try { return new URL(sender.url||sender.origin).origin==='https://web.whatsapp.com'; }
    catch { return false; }
  }
  function isViewerSender(sender) {
    try {
      const u=new URL(sender.url || '');
      const expected=new URL(chrome.runtime.getURL('viewer.html'));
      return u.origin === expected.origin && u.pathname===expected.pathname;
    } catch { return false; }
  }
  function validId(id) { return typeof id==='string' && /^[a-f0-9-]{20,80}$/i.test(id); }
  function sameSender(session,sender) {
    return session.sourceTab === (sender.tab?.id??null) &&
      (!session.documentId || !sender.documentId || session.documentId === sender.documentId);
  }
  function fromBase64(base64) {
    if(typeof base64!=='string' || base64.length>Math.ceil(CHUNK_SIZE/3)*4+12)
      throw new Error('Aktarım paketi boyutu geçersiz.');
    const raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  function asBase64(bytes) {
    let value='';
    for(let i=0;i<bytes.length;i+=16384) value+=String.fromCharCode(...bytes.subarray(i,i+16384));
    return btoa(value);
  }
  async function handle(message,sender) {
    const action=message.action;
    const fromWA=isWhatsappSender(sender);
    const fromViewer=isViewerSender(sender);
    if(!validId(message.id))throw new Error('Aktarım kimliği geçersiz.');
    const id=message.id;

    if(action==='waStart') {
      if(!fromWA)throw new Error('Yalnızca WhatsApp Web destekleniyor.');
      const size=Number(message.size);
      if(!Number.isSafeInteger(size)||size<5||size>MAX_BYTES)
        throw new Error('PDF boyutu 32 MB sınırını aşıyor veya geçersiz.');
      await cleanupStale();
      if(await get('sessions',id))throw new Error('Aktarım zaten mevcut.');
      const name=String(message.name||'WhatsApp.pdf').split(/[\\/]/).pop().slice(0,180);
      await put('sessions',{id,size,name:/\.pdf$/i.test(name)?name:'WhatsApp.pdf',
        sourceTab:sender.tab?.id??null,documentId:sender.documentId||null,
        updatedAt:Date.now(),count:Math.ceil(size/CHUNK_SIZE),received:0,parts:0,ready:false},true);
      try { chrome.alarms.create(ALARM_NAME,{periodInMinutes:10}); } catch {}
      return {ok:true};
    }

    if(action==='waCancel' || action==='waDispose') {
      if((action==='waCancel'&&!fromWA) || (action==='waDispose'&&!fromViewer))
        throw new Error('Kaynak doğrulanamadı.');
      const session=await get('sessions',id);
      if(session && (fromViewer || sameSender(session,sender)))await remove(id);
      return {ok:true};
    }

    const session=await get('sessions',id);
    if(!session)throw new Error('PDF oturumu bulunamadı veya süresi doldu.');

    if(action==='waChunk' || action==='waFinish') {
      if(!fromWA||!sameSender(session,sender))throw new Error('WhatsApp oturumu doğrulanamadı.');
      if(session.ready)throw new Error('Aktarım zaten tamamlandı.');
      if(action==='waChunk') {
        const index=Number(message.index);
        if(!Number.isSafeInteger(index)||index<0||index>=session.count || index!==session.parts)
          throw new Error('PDF parçası sırası geçersiz.');
        const bytes=fromBase64(message.base64);
        const expected=Math.min(CHUNK_SIZE,session.size-index*CHUNK_SIZE);
        if(bytes.length!==expected)throw new Error('PDF parçası uzunluğu geçersiz.');
        if(index===0 && String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')
          throw new Error('PDF imzası geçersiz.');
        await put('chunks',{key:id+':'+index,bytes});
        session.parts++;
        session.received+=bytes.length;
        session.updatedAt=Date.now();
        await put('sessions',session);
        return {ok:true};
      }
      if(session.parts!==session.count || session.received!==session.size)
        throw new Error('PDF parçaları eksik.');
      session.ready=true;
      await put('sessions',session);
      const tab=await chrome.tabs.create({url:chrome.runtime.getURL('viewer.html')+
        '?wa='+encodeURIComponent(id),active:true});
      return {ok:true,tabId:tab.id};
    }

    if(!fromViewer)throw new Error('PDF görüntüleyici doğrulanamadı.');
    if(!session.ready)throw new Error('PDF henüz hazırlanmadı.');
    if(action==='waMeta')return {ok:true,size:session.size,name:session.name,count:session.count};
    if(action==='waReadChunk') {
      const index=Number(message.index);
      if(!Number.isSafeInteger(index)||index<0||index>=session.count)
        throw new Error('Parça numarası geçersiz.');
      const item=await get('chunks',id+':'+index);
      if(!item)throw new Error('PDF parçası bulunamadı.');
      return {ok:true,base64:asBase64(item.bytes)};
    }
    throw new Error('Bilinmeyen WhatsApp aktarım komutu.');
  }

  chrome.runtime.onMessage.addListener((message,sender,reply) => {
    if(!message || typeof message.action!=='string' || !message.action.startsWith('wa'))return false;
    handle(message,sender).then(reply).catch(error=>reply({ok:false,error:String(error?.message||error)}));
    return true;
  });
  chrome.alarms?.onAlarm?.addListener(alarm => {
    if(alarm.name===ALARM_NAME)void cleanupStale().catch(error=>console.warn('WA PDF temizleme:',error));
  });
})();
