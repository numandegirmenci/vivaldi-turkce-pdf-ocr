// User-triggered WhatsApp Web document bridge. No chat history or contact scraping.
(()=>{
  'use strict';
  if(window.__turkcePdfOcrWhatsappContent)return;
  window.__turkcePdfOcrWhatsappContent=true;
  if(location.hostname!=='web.whatsapp.com')return;
  const CHANNEL='turkce-pdf-ocr-whatsapp-v1',LIMIT=32*1024*1024,CHUNK=256*1024;
  const HISTORY_ITEMS=5,HISTORY_BYTES=64*1024*1024;
  let nonce=null,transferring=false;
  const recentFiles=[];
  let status="";
  function fingerprint(bytes){
    // A tiny fingerprint prevents multiple list rows for the same captured file.
    const data=new Uint8Array(bytes),length=data.length;
    let h=2166136261;for(let i=0;i<Math.min(512,length);i++)h=Math.imul(h^data[i],16777619)>>>0;
    return length.toString(16)+':'+h.toString(16);
  }
  function cacheLast(bytes,name,kind,mime){
    const signature=fingerprint(bytes);
    const i=recentFiles.findIndex(file=>file.signature===signature);
    if(i>=0)recentFiles.splice(i,1);
    recentFiles.unshift({bytes,name,kind,mime,signature});
    while(recentFiles.length>HISTORY_ITEMS || recentFiles.reduce((sum,x)=>sum+x.bytes.byteLength,0)>HISTORY_BYTES)
      recentFiles.pop();
  }
  async function openCached(file){
    if(transferring)throw new Error('Bir dosya zaten aktarılıyor.');
    transferring=true;
    try{
      await transfer(file.bytes,file.name,file.kind,file.mime,crypto.randomUUID());
      status='Önceden yakalanan dosya yeniden açıldı.';
    }finally{transferring=false;}
  }
  function ack(){if(nonce)window.postMessage({channel:CHANNEL,type:'ack',nonce},location.origin);}
  function captureVisible(){
    if(!nonce)throw new Error('Önce yakalamayı aç.');
    window.postMessage({channel:CHANNEL,type:'captureVisible',nonce},location.origin);
    status='Açık PDF önizlemesi kontrol ediliyor…';
  }
  function state(){
    return {armed:Boolean(nonce),transferring,status,files:recentFiles.map(file=>({
      id:file.signature,name:file.name,size:file.bytes.byteLength
    }))};
  }
  chrome.runtime.onMessage.addListener((request,sender,respond)=>{
    if(sender.id!==chrome.runtime.id||request?.action!=='whatsappControl')return;
    async function handle(){
      if(request.command==='state')return state();
      if(transferring)throw new Error('Bir dosya zaten aktarılıyor.');
      switch(request.command){
        case 'toggle':
          if(nonce){
            window.postMessage({channel:CHANNEL,type:'cancel',nonce},location.origin);
            nonce=null;
            status='Otomatik yakalama kapalı.';
          }else{
            nonce=crypto.randomUUID();
            window.postMessage({channel:CHANNEL,type:'arm',nonce},location.origin);
            status='Yakalama hazır. WhatsApp’taki PDF mesajını açabilirsin.';
          }
          break;
        case 'captureVisible':
          captureVisible();
          break;
        case 'reopen': {
          const file=recentFiles.find(entry=>entry.signature===request.id);
          if(!file)throw new Error('Dosya artık son dosyalar listesinde yok.');
          await openCached(file);
          break;
        }
        default:throw new Error('Bilinmeyen yakalama işlemi.');
      }
      return state();
    }
    handle().then(result=>respond({ok:true,...result}),error=>{
      status=String(error?.message||error);
      respond({ok:false,error:status,...state()});
    });
    return true;
  });
  function toBase64(bytes){let t='';for(let i=0;i<bytes.length;i+=16384)t+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(t);}
  async function send(data){const r=await chrome.runtime.sendMessage(data);if(!r?.ok)throw new Error(r?.error||'Eklenti yanıt vermedi.');return r;}
  async function transfer(bytes,name,kind,mime,id){
    const data=new Uint8Array(bytes);
    if(data.length<1||data.length>LIMIT||!['pdf','png','jpeg','webp','gif','bmp','docx','xlsx','pptx','odt','text'].includes(kind))throw new Error('Dosya türü veya boyutu desteklenmiyor.');
    await send({action:'waStart',id,size:data.length,name,kind,mime});
    try{
      const total=Math.ceil(data.length/CHUNK);
      for(let index=0;index<total;index++){
        await send({action:'waChunk',id,index,base64:toBase64(data.subarray(index*CHUNK,(index+1)*CHUNK))});
        if(index%4===0||index===total-1)status='Dosya aktarılıyor: %'+Math.round((index+1)*100/total);
      }
      await send({action:'waFinish',id});
    }catch(err){try{await chrome.runtime.sendMessage({action:'waCancel',id});}catch{}throw err;}
  }
  window.addEventListener('message',async event=>{
    if(event.source!==window||event.origin!==location.origin)return;
    const m=event.data;
    if(!nonce||m?.channel!==CHANNEL||m?.nonce!==nonce)return;
    if(m.type==='error'){status='Dosya açılamadı: '+String(m.message||'Bilinmeyen hata');ack();return;}
    if(!['file','pdf'].includes(m.type)||transferring||!(m.bytes instanceof ArrayBuffer))return;
    const kind=m.kind||(m.type==='pdf'?'pdf':null);
    if(!['pdf','png','jpeg','webp','gif','bmp','docx','xlsx','pptx','odt','text'].includes(kind))return;
    transferring=true;
    try{await transfer(m.bytes,m.name||'WhatsApp',kind,m.mime||'',crypto.randomUUID());cacheLast(m.bytes,m.name||'WhatsApp',kind,m.mime||'');status='Dosya yakalandı. Önceki belgeleri Son dosyalar listesinden açabilirsin.';}
    catch(e){status='Aktarım başarısız: '+String(e?.message||e)+' • Dosyayı indirip eklentiden seçebilirsin.';}
    finally{ack();transferring=false;}
  });
})();
