// User-triggered WhatsApp Web PDF transfer to the extension. No chat scraping.
(() => {
  'use strict';
  if (window.__turkcePdfOcrWhatsappContent) return;
  window.__turkcePdfOcrWhatsappContent = true;
  if (location.hostname !== 'web.whatsapp.com') return;

  const CHANNEL = 'turkce-pdf-ocr-whatsapp-v1';
  const LIMIT = 32 * 1024 * 1024;
  const CHUNK_SIZE = 96 * 1024;
  const LAST_PDF_MS = 5 * 60 * 1000;
  let nonce = null, countdown = null, transferring = false;
  let lastPdf = null, lastPdfExpiry = null;
  const host = document.createElement('div');
  host.id = 'turkce-pdf-ocr-whatsapp-control';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .box { position:fixed;right:15px;bottom:18px;z-index:2147483640;
      font:12px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;
      color:#ecfeff;max-width:min(330px,calc(100vw - 30px)); }
    button { font:inherit;cursor:pointer; }
    .action { color:white;background:#075e54;border:1px solid #5cd1a4;
      padding:10px 13px;border-radius:25px;box-shadow:0 4px 16px #0005;
      font-weight:650; }
    .action:disabled{opacity:.65;cursor:progress}
    .reopen{background:#144c59;margin-left:6px}
    .message {background:#122c35;border:1px solid #67beaa;border-radius:9px;
      margin-top:5px;padding:9px;max-width:310px;word-break:break-word}
    [hidden]{display:none!important}
  `;
  const box = document.createElement('div'); box.className = 'box';
  const button = document.createElement('button');button.type = 'button';
  button.className='action';button.textContent='📄 PDF OCR ile aç';
  button.setAttribute('aria-label','WhatsApp PDF belgesini Türkçe OCR ile aç');
  const reopen = document.createElement('button');
  reopen.type='button';
  reopen.className='action reopen';
  reopen.textContent='↻ Son PDF';
  reopen.title='Son açılan PDF dosyasını 5 dakika içinde yeniden aç';
  reopen.setAttribute('aria-label','Son açılan WhatsApp PDF belgesini yeniden OCR ile aç');
  reopen.hidden=true;
  const message = document.createElement('div');message.className='message';
  message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  message.hidden = true;
  box.append(button,reopen,message);shadow.append(style,box);
  (document.body || document.documentElement).append(host);

  function show(text, hideAfter = 0) {
    message.textContent = text;
    message.hidden = !text;
    if (hideAfter) setTimeout(() => { if (message.textContent === text) message.hidden = true; }, hideAfter);
  }
  function clearLast() {
    lastPdf=null;
    if(lastPdfExpiry)clearTimeout(lastPdfExpiry);
    lastPdfExpiry=null;
    reopen.hidden=true;
  }
  function cacheLast(bytes,name) {
    clearLast();
    // Geçici bellek: WhatsApp sekmesi kapanınca veya 5 dakika geçince yok olur.
    lastPdf={bytes,name,until:Date.now()+LAST_PDF_MS};
    reopen.hidden=false;
    lastPdfExpiry=setTimeout(clearLast,LAST_PDF_MS+50);
  }
  function currentLast() {
    if(lastPdf && lastPdf.until>Date.now())return lastPdf;
    clearLast();
    return null;
  }
  function stop() {
    if (countdown) clearTimeout(countdown);
    countdown = null;
    if (nonce) window.postMessage({channel:CHANNEL,type:'cancel',nonce},location.origin);
    nonce = null;
    transferring = false;
    button.disabled = false;
    reopen.disabled = false;
    button.textContent = '📄 PDF OCR ile aç';
  }
  button.addEventListener('click', () => {
    if (transferring) return;
    if (nonce) { stop();show('Yakalama iptal edildi.',2500);return; }
    nonce = crypto.randomUUID();
    button.textContent = '✕ Yakalamayı iptal et';
    show('45 saniye içinde PDF belgesini aç. Normal önizleme yakalanmazsa üstteki "PDF düzenle" seçeneğini dene.');
    window.postMessage({ channel: CHANNEL, type: 'arm', nonce }, location.origin);
    countdown = setTimeout(() => {
      if (nonce) { stop();show('PDF yakalanamadı. Üstteki "PDF düzenle" seçeneğini deneyebilir veya indirip PDF seç ile açabilirsin.',9000); }
    }, 45000);
  });

  function toBase64(bytes) {
    let text = '';
    for (let i = 0; i < bytes.length; i += 16384)
      text += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(text);
  }
  async function send(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) throw new Error(response?.error || 'Eklenti yanıt vermedi.');
    return response;
  }
  async function transfer(bytes, name, id) {
    const data = new Uint8Array(bytes);
    if (data.length < 5 || data.length > LIMIT ||
      String.fromCharCode(...data.subarray(0,5)) !== '%PDF-')
      throw new Error('PDF geçerli değil veya 32 MB sınırını aşıyor.');
    await send({ action: 'waStart', id, size: data.length, name });
    try {
      const total = Math.ceil(data.length / CHUNK_SIZE);
      for (let index = 0; index < total; index++) {
        const chunk = data.subarray(index * CHUNK_SIZE, (index+1)*CHUNK_SIZE);
        await send({ action: 'waChunk', id, index, base64: toBase64(chunk) });
        if (index % 8 === 0 || index === total - 1)
          show('PDF hazırlanıyor: %' + Math.round((index+1)*100/total));
      }
      await send({ action: 'waFinish', id });
    } catch (error) {
      try { await chrome.runtime.sendMessage({action:'waCancel',id}); } catch {}
      throw error;
    }
  }
  reopen.addEventListener('click', async () => {
    if(nonce || transferring)return;
    const cached=currentLast();
    if(!cached){show('Son PDF artık bellekte yok. WhatsApp üzerinden yeniden açabilirsin.',8000);return;}
    transferring=true;
    button.disabled=true;reopen.disabled=true;
    reopen.textContent='⏳ Açılıyor';
    try {
      await transfer(cached.bytes,cached.name,crypto.randomUUID());
      show('Son PDF yeniden açıldı.',5000);
    }catch(error){
      show('PDF yeniden açılamadı: '+String(error?.message||error),9000);
    }finally {
      reopen.textContent='↻ Son PDF';
      stop();
    }
  });

  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg=event.data;
    if (msg?.channel!==CHANNEL || msg?.nonce!==nonce) return;
    if (msg.type === 'error') {
      show('PDF açılamadı: '+String(msg.message||'Bilinmeyen hata'), 8500);
      stop();return;
    }
    if (msg.type !== 'pdf' || transferring || !(msg.bytes instanceof ArrayBuffer)) return;
    transferring = true;
    if (countdown) clearTimeout(countdown);
    button.disabled=true;reopen.disabled=true;button.textContent='⏳ PDF aktarılıyor';
    const currentId=nonce;
    try {
      await transfer(msg.bytes,msg.name,currentId);
      cacheLast(msg.bytes,msg.name);
      show('PDF açıldı. Kapatırsan "↻ Son PDF" ile 5 dakika içinde tekrar açabilirsin.',9000);
    } catch (error) {
      show('WhatsApp PDF aktarımı başarısız: '+String(error?.message || error)+
        ' • PDF dosyasını indirip eklentiden seçebilirsin.',12000);
    } finally { stop(); }
  });
})();
