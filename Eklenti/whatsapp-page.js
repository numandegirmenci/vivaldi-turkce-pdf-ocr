// User-enabled WhatsApp document observation. A second open of the same file is a new capture.
// Does not read chat messages, history, contacts or unrelated network responses.
(() => {
  'use strict';
  if (window.__turkcePdfOcrWhatsappHook) return;
  window.__turkcePdfOcrWhatsappHook = true;
  const CHANNEL = 'turkce-pdf-ocr-whatsapp-v1';
  const MAX_BYTES = 32 * 1024 * 1024;
  const GESTURE_MS = 12_000;
  const DUPLICATE_MS = 1_800;
  const PREVIEW_RESCAN_MS = [100, 400, 1000];
  const CACHE_LIMIT = 64 * 1024 * 1024;
  const CACHE_ENTRIES = 5;
  const CACHE_AGE_MS = 30 * 60 * 1000;
  let armed = null, busy = false, observer = null, gestureUntil = 0, ackTimer = null, gestureSerial = 0;
  const recentBlobs = new WeakMap();
  const recentUrls = new Map();
  const urlRequests = new Set();
  // Reused/revoked blob: URLs do not trigger createObjectURL for a second viewing.
  // Keep only documents explicitly captured during this WhatsApp tab session.
  const capturedUrls = new Map();
  let capturedBytes = 0, previewEpoch = 0;
  let captureSerial = -1; // One document at most per user document interaction.
  const extensions = {pdf:'pdf',png:'png',jpeg:'jpg',webp:'webp',gif:'gif',bmp:'bmp',docx:'docx',xlsx:'xlsx',pptx:'pptx',odt:'odt',text:'txt'};
  const mimes = {
    pdf:'application/pdf',png:'image/png',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt:'application/vnd.oasis.opendocument.text',text:'text/plain'
  };
  function detect(header, mime = '', name = '') {
    const b = new Uint8Array(header), s = (i,n) => String.fromCharCode(...b.slice(i,i+n));
    const ext = String(name).split('.').pop().toLowerCase();
    const type = String(mime).toLowerCase().split(';')[0];
    if(s(0,5)==='%PDF-')return 'pdf';
    if(b.length>=8&&b[0]===137&&s(1,3)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return 'png';
    if(b[0]===255&&b[1]===216&&b[2]===255)return 'jpeg';
    if(s(0,4)==='RIFF'&&s(8,4)==='WEBP')return 'webp';
    if(s(0,6)==='GIF89a'||s(0,6)==='GIF87a')return 'gif';
    if(s(0,2)==='BM')return 'bmp';
    if(s(0,4)==='PK\x03\x04'){
      if(ext==='docx'||type.includes('wordprocessingml.document'))return 'docx';
      if(ext==='xlsx'||type.includes('spreadsheetml.sheet'))return 'xlsx';
      if(ext==='pptx'||type.includes('presentationml.presentation'))return 'pptx';
      if(ext==='odt'||type.includes('opendocument.text'))return 'odt';
    }
    if(['txt','csv','md','log','json','xml','html','htm','rtf','tsv'].includes(ext) ||
       ['text/plain','text/csv','text/markdown','text/html','application/json','text/xml','application/xml','text/tab-separated-values','application/rtf'].includes(type)) {
      if(b.length===0||b.some(x=>x===0))return null;
      return 'text';
    }
    return null;
  }
  function nameOf(name,kind) {
    const value=String(name||'').split(/[\\/]/).pop().slice(0,180);
    const valid = kind==='text'?'txt|csv|md|log|json|xml|html|htm|rtf|tsv':
      kind==='jpeg'?'jpg|jpeg':kind;
    return new RegExp('\\.('+valid+')$','i').test(value)?value:'WhatsApp.'+extensions[kind];
  }
  function post(type,nonce,extra={},bytes=null){
    window.postMessage({channel:CHANNEL,type,nonce,...extra},location.origin,bytes?[bytes]:[]);
  }
  function release(){
    busy=false;
    gestureUntil=0; // An ACK must NEVER reactivate 12-second background rescanning.
    previewEpoch++;
    if(ackTimer)clearTimeout(ackTimer);
    ackTimer=null;
  }
  function remember(url,bytes,name,kind){
    if(!/^blob:/i.test(String(url||'')))return;
    const old=capturedUrls.get(url);
    if(old)capturedBytes-=old.bytes.byteLength;
    const snapshot=bytes.slice(0); // postMessage transfers/detaches the original ArrayBuffer
    capturedUrls.delete(url);
    capturedUrls.set(url,{bytes:snapshot,name,kind,at:Date.now()});
    capturedBytes+=snapshot.byteLength;
    const now=Date.now();
    for(const [key,item] of capturedUrls){
      if(now-item.at>CACHE_AGE_MS || capturedBytes>CACHE_LIMIT || capturedUrls.size>CACHE_ENTRIES){
        capturedBytes-=item.bytes.byteLength;capturedUrls.delete(key);
      }
    }
  }
  function reemitCached(url,name=''){
    const item=capturedUrls.get(url);
    if(!item||!ready()||busy||!reserve(url))return false;
    if(Date.now()-item.at>CACHE_AGE_MS){capturedBytes-=item.bytes.byteLength;capturedUrls.delete(url);return false;}
    const nonce=armed.nonce;
    busy=true;captureSerial=gestureSerial;
    try{
      const bytes=item.bytes.slice(0);
      const label=name&&nameOf(name,item.kind)!==`WhatsApp.${extensions[item.kind]}`?name:item.name;
      post('file',nonce,{name:label,kind:item.kind,mime:mimes[item.kind],bytes},bytes);
      ackTimer=setTimeout(release,90_000);
      return true;
    }catch{release();return false;}
  }

  function disarm(){armed=null;gestureUntil=0;release();observer?.disconnect();observer=null;recentUrls.clear();previewEpoch++;}
  function ready(){return armed && !busy && captureSerial!==gestureSerial && Date.now() < gestureUntil;}
  function reserve(key,blob){
    const now=Date.now();
    const u=key?recentUrls.get(key):null,b=blob?recentBlobs.get(blob):null;
    if(u && u.gesture===gestureSerial && now-u.at<DUPLICATE_MS)return false;
    if(b && b.gesture===gestureSerial && now-b.at<DUPLICATE_MS)return false;
    if(key){recentUrls.set(key,{at:now,gesture:gestureSerial});
      if(recentUrls.size>60){for(const [old,item] of recentUrls)if(now-item.at>DUPLICATE_MS)recentUrls.delete(old);}}
    if(blob)recentBlobs.set(blob,{at:now,gesture:gestureSerial});
    return true;
  }
  async function captureBlob(blob,name='',key=''){
    const nonce=armed?.nonce, initiatedOn=gestureSerial;
    if(!ready() || !(blob instanceof Blob) || !blob.size)return false;
    if(blob.size>MAX_BYTES){
      if(/pdf|image|word|sheet|presentation|text/.test(blob.type||''))post('error',nonce,{message:'32 MB üzerindeki dosyayı indirip Dosyadan seç ile aç.'});
      return false;
    }
    // Keep busy=false for unsupported blobs; WhatsApp can create several unrelated blobs per click.
    let kind;
    try{kind=detect(await blob.slice(0,64).arrayBuffer(),blob.type,name);}catch{return false;}
    if(!kind || !ready() || gestureSerial!==initiatedOn || armed?.nonce!==nonce || !reserve(key,blob))return false;
    busy=true;captureSerial=gestureSerial;
    try{
      const bytes=await blob.arrayBuffer();
      if(detect(bytes.slice(0,64),blob.type,name)!==kind)throw Error('Dosya tipi doğrulanamadı.');
      const selectedName=nameOf(name,kind);
      remember(key,bytes,selectedName,kind);
      post('file',nonce,{name:selectedName,kind,mime:mimes[kind],bytes},bytes);
      // The content script acknowledges after viewer tab creation. Avoid duplicates until then.
      ackTimer=setTimeout(release,90_000);
      return true;
    }catch(error){release();post('error',nonce,{message:String(error?.message||error)});return false;}
  }
  function captureUrl(url,name=''){
    if(!ready()||!/^blob:/i.test(String(url||'')))return;
    if(reemitCached(url,name))return;
    if(urlRequests.has(url))return;
    const initiatedOn=gestureSerial;
    urlRequests.add(url);
    void Promise.resolve().then(()=>fetch(url)).then(r=>{
      if(!r.ok)throw Error('Blob bağlantısı okunamadı');return r.blob();
    }).then(blob=>initiatedOn===gestureSerial?captureBlob(blob,name,url):false).catch(()=>{})
      .finally(()=>urlRequests.delete(url));
  }
  // IMPORTANT: enabling capture does not authorize unrelated WhatsApp clicks.
  // v0.5.5 accepted *every* click and scanned up to 30 blob thumbnails/iframes.
  // That could launch a storm of OCR tabs. Only a document action opens the gate.
  function isDocumentAction(event) {
    const path=event.composedPath?.()||[];
    if(path.some(node=>node?.id==='turkce-pdf-ocr-whatsapp-control'))return false;
    const el=event.target?.nodeType===1?event.target:event.target?.parentElement;
    if(!el?.closest)return false;
    // Dialog close, file controls and navigation never start capture.
    const meta=(el.getAttribute?.('aria-label')||'')+' '+(el.getAttribute?.('data-testid')||'');
    if(/close|kapat|geri|back|cancel|iptal/i.test(meta))return false;
    const direct=el.closest('a[href^="blob:"], a[download], [data-testid*="document"], [data-testid*="pdf"], [aria-label*="PDF"], [aria-label*="pdf"], [aria-label*="belge"], [aria-label*="document"]');
    if(direct)return true;
    // A WhatsApp file bubble sometimes has no document attribute: inspect only
    // the closest button, not the entire chat containing many PDF filenames.
    const action=el.closest('[role="button"],button,[tabindex="0"]');
    const label=String(action?.textContent||'').slice(0,240);
    return /\.(?:pdf|docx|xlsx|pptx|odt|txt|csv|jpg|jpeg|png)\b/i.test(label)
      || /PDF.{0,8}düzenle|edit.{0,8}PDF/i.test(label);
  }
  function beginGesture() {
    if(!armed||busy)return false;
    gestureSerial++;
    gestureUntil=Date.now()+GESTURE_MS;
    rescanPreviewAfterGesture();
    return true;
  }
  document.addEventListener?.('click',event=>{
    if(!armed||event.isTrusted===false||!isDocumentAction(event))return;
    if(!beginGesture())return;
    const a=event.target?.closest?.('a[href^="blob:"]');
    if(a)captureUrl(a.href,a.download||'');
  },true);
  const nativeCreate=URL.createObjectURL;
  URL.createObjectURL=function(object){
    const url=nativeCreate.apply(this,arguments);
    if(ready()&&object instanceof Blob)void captureBlob(object,object.name||'',url);
    return url;
  };
  const nativeClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(...args){
    if(ready())captureUrl(this.href,this.download||'');
    return nativeClick.apply(this,args);
  };
  if(typeof window.open==='function'){
    const nativeOpen=window.open;
    window.open=function(url,...args){if(ready())captureUrl(url,'');return nativeOpen.call(this,url,...args);};
  }
  function visiblyOpen(el){
    if(!el?.getClientRects)return true; // headless unit-test documents
    if(!el.getClientRects().length)return false;
    const rect=el.getBoundingClientRect?.();
    // Ignore tiny image thumbnails, avatars and hidden dormant previews.
    if(el.tagName==='IMG' && rect && Math.max(rect.width,rect.height)<200)return false;
    return true;
  }
  function inspect(root=document){
    if(!ready())return;
    const selector='iframe[src^="blob:"],embed[src^="blob:"],object[data^="blob:"]';
    for(const el of Array.from(root.querySelectorAll?.(selector)||[]).slice(0,8)){
      if(visiblyOpen(el))captureUrl(el.src||el.data,el.download||'');
    }
    if(root.matches?.(selector)&&visiblyOpen(root))captureUrl(root.src||root.data,root.download||'');
  }
  function rescanPreviewAfterGesture(){
    const epoch=++previewEpoch;
    for(const delay of PREVIEW_RESCAN_MS){
      setTimeout(()=>{
        if(epoch!==previewEpoch||!ready())return;
        inspect(document);
      },delay);
    }
  }
  function watch(){
    if(typeof MutationObserver==='undefined')return;
    observer=new MutationObserver(records=>{
      if(!ready())return;
      for(const rec of records){
        if(rec.type==='attributes')inspect(rec.target);
        for(const node of rec.addedNodes||[])if(node.nodeType===1)inspect(node);
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data']});
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin)return;
    const m=event.data;if(m?.channel!==CHANNEL)return;
    if(m.type==='cancel') {if(armed?.nonce===m.nonce)disarm();return;}
    if(m.type==='ack') {if(armed?.nonce===m.nonce)release();return;}
    if(m.type==='captureVisible') {
      if(armed?.nonce!==m.nonce||busy)return;
      // Explicit action: only a visible embedded preview, never thumbnails or chat history.
      const selector='iframe[src^="blob:"],embed[src^="blob:"],object[data^="blob:"]';
      const found=Array.from(document.querySelectorAll?.(selector)||[]).filter(visiblyOpen);
      const urls=[...new Set(found.map(el=>el.src||el.data).filter(Boolean))];
      if(urls.length!==1){
        post('error',m.nonce,{message:urls.length ? 'Birden fazla önizleme var. Sadece istediğin belge açıkken tekrar dene.' : 'Açık PDF önizlemesi bulunamadı. Önce WhatsApp belgesini aç.'});
        return;
      }
      gestureSerial++;gestureUntil=Date.now()+GESTURE_MS;
      captureUrl(urls[0]);
      return;
    }
    if(m.type!=='arm'||typeof m.nonce!=='string'||!/^[a-f0-9-]{20,80}$/i.test(m.nonce))return;
    if(armed?.nonce===m.nonce)return; // idempotent arm
    disarm();armed={nonce:m.nonce};watch(); // No scanning on arm.
    // Wait for a real document gesture, or manual captureVisible below.
  });
  window.addEventListener?.('pagehide',disarm);
})();
