// User-triggered WhatsApp Web document bridge. No chat history or contact scraping.
(()=>{
  'use strict';
  if(window.__turkcePdfOcrWhatsappContent)return;
  window.__turkcePdfOcrWhatsappContent=true;
  if(location.hostname!=='web.whatsapp.com')return;
  const CHANNEL='turkce-pdf-ocr-whatsapp-v1',LIMIT=32*1024*1024,CHUNK=256*1024;
  const HISTORY_ITEMS=5,HISTORY_BYTES=64*1024*1024;
  let nonce=null,countdown=null,transferring=false;
  const recentFiles=[];
  const host=document.createElement('div');host.id='turkce-pdf-ocr-whatsapp-control';
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');
  style.textContent=`:host{all:initial}.box{position:fixed;right:15px;bottom:18px;z-index:2147483640;font:12px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#ecfeff;max-width:min(330px,calc(100vw - 30px))}button{font:inherit;cursor:pointer}.action{color:white;background:#075e54;border:1px solid #5cd1a4;padding:10px 13px;border-radius:25px;box-shadow:0 4px 16px #0005;font-weight:650}.action:disabled{opacity:.65;cursor:progress}.reopen{background:#144c59;margin-left:6px}.message{background:#122c35;border:1px solid #67beaa;border-radius:9px;margin-top:5px;padding:9px;max-width:310px;word-break:break-word}.file-history{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto}.history-item{color:#fff;background:#174b5b;padding:7px;text-align:left;border:1px solid #4f8b93;border-radius:5px;white-space:normal;overflow-wrap:anywhere}[hidden]{display:none!important}`;
  const box=document.createElement('div');box.className='box';
  const button=document.createElement('button');button.type='button';button.className='action';button.textContent='📄 Yakalamayı aç';
  const captureVisible=document.createElement('button');captureVisible.type='button';
  captureVisible.className='action reopen';captureVisible.textContent='🎯 Açık PDF önizlemesini yakala';
  captureVisible.hidden=true;
  const reopen=document.createElement('button');reopen.type='button';reopen.className='action reopen';
  reopen.textContent='📚 Son dosyalar';reopen.hidden=true;
  const history=document.createElement('div');history.className='message file-history';history.hidden=true;
  history.setAttribute('aria-label','Önceden yakalanan dosyalar');
  // WhatsApp istemci sürümleri bazı dosyaları erişilebilir blob olarak sunmaz.
  // Kullanıcının kendi seçtiği dosyayı aynı geçici aktarım yolundan gönderen güvenilir alternatif.
  const choose=document.createElement('button'); choose.type='button'; choose.className='action reopen';
  choose.textContent='📂 Dosyadan seç'; choose.title='WhatsApp eki yakalanmadıysa indirdiğin dosyayı doğrudan seç';
  const chooser=document.createElement('input');chooser.type='file';
  chooser.accept='.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.docx,.xlsx,.pptx,.odt,.txt,.csv,.md,.log,.json,.xml,.html,.htm,.rtf,.tsv';chooser.hidden=true;
  const message=document.createElement('div');message.className='message';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.hidden=true;
  box.append(button,captureVisible,reopen,choose,chooser,history,message);shadow.append(style,box);
  (document.body||document.documentElement).append(host);
  function show(text,delay=0){message.textContent=text;message.hidden=!text;
    if(delay)setTimeout(()=>{if(message.textContent===text)message.hidden=true;},delay);}
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
    reopen.hidden=!recentFiles.length;
    reopen.textContent='📚 Son dosyalar ('+recentFiles.length+')';
    renderHistory();
  }
  function renderHistory(){
    history.replaceChildren();
    const title=document.createElement('strong');title.textContent='Tekrar OCR ile aç';history.append(title);
    recentFiles.forEach((file,index)=>{
      const item=document.createElement('button');item.type='button';item.className='history-item';
      item.textContent=(index+1)+'. '+file.name+' ('+(file.bytes.byteLength/1024/1024).toFixed(1)+' MB)';
      item.addEventListener('click',()=>openCached(file));history.append(item);
    });
  }
  async function openCached(file){
    if(transferring)return;
    transferring=true;button.disabled=true;reopen.disabled=true;choose.disabled=true;
    try{await transfer(file.bytes,file.name,file.kind,file.mime,crypto.randomUUID());
      show('Önceden yakalanan dosya yeniden açıldı.',5000);history.hidden=true;
    }catch(e){show('Yeniden açılamadı: '+String(e?.message||e),9000);}
    finally{readyAgain();choose.disabled=false;}
  }
  function stop(){if(countdown)clearTimeout(countdown);countdown=null;
    if(nonce)window.postMessage({channel:CHANNEL,type:'cancel',nonce},location.origin);
    nonce=null;transferring=false;button.disabled=false;reopen.disabled=false;captureVisible.hidden=true;button.textContent='📄 Yakalamayı aç';}
  function ack(){if(nonce)window.postMessage({channel:CHANNEL,type:'ack',nonce},location.origin);}
  function readyAgain(){transferring=false;button.disabled=false;reopen.disabled=false;
    button.textContent=nonce?'■ Yakalamayı kapat':'📄 Yakalamayı aç';}

  button.addEventListener('click',()=>{
    if(transferring)return;
    if(nonce){stop();show('Otomatik yakalama kapatıldı. Son dosyayı yeniden açabilir veya dosyadan seçebilirsin.',6000);return;}
    nonce=crypto.randomUUID();button.textContent='■ Yakalamayı kapat';captureVisible.hidden=false;
    show('Yakalama hazır. PDF mesajını açınca en fazla bir OCR sekmesi oluşturulur. Otomatik yakalanmazsa Açık PDF önizlemesini yakala düğmesini kullan.',12000);
    window.postMessage({channel:CHANNEL,type:'arm',nonce},location.origin);
  });
  captureVisible.addEventListener('click',()=>{
    if(!nonce||transferring)return;
    window.postMessage({channel:CHANNEL,type:'captureVisible',nonce},location.origin);
    show('Sadece açık PDF önizlemesi kontrol ediliyor...',3500);
  });
  function detectLocalFile(bytes,name,mime){
    const b=new Uint8Array(bytes.slice(0,32));
    const str=(a,n)=>String.fromCharCode(...b.slice(a,a+n));
    const ext=String(name||'').split('.').pop().toLowerCase();
    if(str(0,5)==='%PDF-')return 'pdf';
    if(b[0]===137&&str(1,3)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return 'png';
    if(b[0]===255&&b[1]===216&&b[2]===255)return 'jpeg';
    if(str(0,4)==='RIFF'&&str(8,4)==='WEBP')return 'webp';
    if(['GIF87a','GIF89a'].includes(str(0,6)))return 'gif';
    if(str(0,2)==='BM')return 'bmp';
    if(str(0,4)==='PK\x03\x04'&&['docx','xlsx','pptx','odt'].includes(ext))return ext;
    if(['txt','csv','md','log','json','xml','html','htm','rtf','tsv'].includes(ext)&&b[0]!==0)return 'text';
    return null;
  }
  choose.addEventListener('click',()=>chooser.click());
  chooser.addEventListener('change',async()=>{
    const file=chooser.files?.[0];chooser.value='';if(!file||transferring)return;
    if(file.size>LIMIT){show('Dosya 32 MB sınırını aşıyor.',8000);return;}
    transferring=true;button.disabled=true;reopen.disabled=true;choose.disabled=true;
    try{
      const bytes=await file.arrayBuffer(),kind=detectLocalFile(bytes,file.name,file.type);
      if(!kind)throw new Error('Dosya türü desteklenmiyor veya dosya bozuk.');
      await transfer(bytes,file.name,kind,file.type,crypto.randomUUID());
      cacheLast(bytes,file.name,kind,file.type);
      show('Dosya açıldı. OCR sekmesine geçebilirsin.',8000);
    }catch(error){show('Dosya açılamadı: '+String(error?.message||error),10000);}
    finally{readyAgain();choose.disabled=false;}
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
        if(index%4===0||index===total-1)show('Dosya aktarılıyor: %'+Math.round((index+1)*100/total));
      }
      await send({action:'waFinish',id});
    }catch(err){try{await chrome.runtime.sendMessage({action:'waCancel',id});}catch{}throw err;}
  }
  reopen.addEventListener('click',()=>{
    if(transferring)return;
    history.hidden=!history.hidden;
    if(!history.hidden)renderHistory();
  });
  window.addEventListener('message',async event=>{
    if(event.source!==window||event.origin!==location.origin)return;
    const m=event.data;
    if(m?.channel!==CHANNEL||m?.nonce!==nonce)return;
    if(m.type==='error'){show('Dosya açılamadı: '+String(m.message||'Bilinmeyen hata'),8500);ack();readyAgain();return;}
    if(!['file','pdf'].includes(m.type)||transferring||!(m.bytes instanceof ArrayBuffer))return;
    const kind=m.kind||(m.type==='pdf'?'pdf':null);
    if(!['pdf','png','jpeg','webp','gif','bmp','docx','xlsx','pptx','odt','text'].includes(kind))return;
    transferring=true;button.disabled=true;reopen.disabled=true;button.textContent='⏳ Dosya aktarılıyor';
    try{await transfer(m.bytes,m.name||'WhatsApp',kind,m.mime||'',crypto.randomUUID());cacheLast(m.bytes,m.name||'WhatsApp',kind,m.mime||'');show("Dosya yakalandı. Önceki PDF'leri Son dosyalar listesinden de açabilirsin.",9000);}
    catch(e){show('Aktarım başarısız: '+String(e?.message||e)+' • Dosyayı indirip eklentiden seçebilirsin.',12000);}
    finally{ack();readyAgain();}
  });
})();
