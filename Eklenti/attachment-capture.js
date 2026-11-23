// Explicitly user-triggered capture of a document/image from the active tab/frame.
// Runs in Chromium's isolated world; never reads mail content or scans attachments.
async function captureOcrAttachment({id, sourceUrl = ''}) {
  const LIMIT = 32 * 1024 * 1024, CHUNK = 256 * 1024;
  const isDocumentUrl = value => /\.(?:pdf|jpe?g|png|webp|gif|bmp)(?:$|[?#])/i.test(String(value || ''));
  const selectedEmbedded = () => {
    for (const el of document.querySelectorAll('embed, object, iframe')) {
      const value = el.getAttribute('src') || el.getAttribute('data') || '';
      if (value && (/pdf/i.test(el.getAttribute('type') || '') || isDocumentUrl(value)))
        return new URL(value, location.href).href;
    }
    return '';
  };
  const identify = (bytes, filename) => {
    const b = bytes, ascii = (start, length) => String.fromCharCode(...b.subarray(start, start + length));
    if (ascii(0, 5) === '%PDF-') return 'pdf';
    if (b[0] === 137 && ascii(1, 3) === 'PNG' && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10) return 'png';
    if (b[0] === 255 && b[1] === 216 && b[2] === 255) return 'jpeg';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp';
    if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) return 'gif';
    if (ascii(0, 2) === 'BM') return 'bmp';
    if (ascii(0, 4) === 'PK\x03\x04') {
      const ext = String(filename).split('.').pop().toLowerCase();
      if (['docx', 'xlsx', 'pptx', 'odt'].includes(ext)) return ext;
    }
    return null;
  };
  const toBase64 = bytes => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(binary);
  };
  const send = async message => {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || 'Aktarım reddedildi.');
    return result;
  };
  let address = sourceUrl || '';
  try {
    if (!address && /^(application\/pdf|image\/(?:png|jpeg|webp|gif|bmp))$/i.test(document.contentType || ''))
      address = location.href;
    if (!address) address = selectedEmbedded();
    if (!address) throw new Error('Bu sayfa dosyanın kendisi değil. OneDrive veya Outlook önizlemesinde İndir seçeneğiyle dosyayı kaydedip OCR ekranından PDF seç ile aç.');
    address = new URL(address, location.href).href;
    if (!/^(https?:|blob:|data:|file:)/i.test(address))
      throw new Error('Desteklenmeyen bağlantı türü.');
    const response = await fetch(address, {credentials: 'include', cache: 'no-store'});
    if (!response.ok) throw new Error('Dosyaya erişilemedi (HTTP ' + response.status + '). Gerekirse indirip PDF seç ile aç.');
    const declared = Number(response.headers.get('content-length'));
    if (declared > LIMIT) throw new Error('Dosya 32 MB sınırını aşıyor.');
    const reader = response.body?.getReader();
    let bytes;
    if (reader) {
      let size = 0;
      const parts = [];
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        if (size > LIMIT) { await reader.cancel(); throw new Error('Dosya 32 MB sınırını aşıyor.'); }
        parts.push(next.value);
      }
      bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    } else {
      const data = await response.arrayBuffer();
      if (data.byteLength > LIMIT) throw new Error('Dosya 32 MB sınırını aşıyor.');
      bytes = new Uint8Array(data);
    }
    let name = 'belge';
    try {
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i) || disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
      name = filename ? decodeURIComponent(filename[1].trim()) : (new URL(address).searchParams.get('filename') || decodeURIComponent(new URL(address).pathname.split('/').pop()) || name);
    } catch { /* opaque blob/data URL */ }
    name = name.split(/[\\/]/).pop().slice(0, 180) || 'belge';
    const kind = identify(bytes, name);
    if (!kind) throw new Error('Bağlantı PDF/fotoğraf dosyası yerine önizleme HTML sayfası döndürüyor. OneDrive/Outlook içinden İndir kullanıp dosyayı OCR ekranından seç.');
    if (name === 'belge' || !/\.[a-z0-9]{2,5}$/i.test(name))
      name += '.' + ({jpeg:'jpg'}[kind] || kind);
    await send({action:'ctxStart', id, size:bytes.length, name, kind, mime:response.headers.get('content-type') || ''});
    try {
      const count = Math.ceil(bytes.length / CHUNK);
      for (let index = 0; index < count; index++)
        await send({action:'ctxChunk', id, index, base64:toBase64(bytes.subarray(index * CHUNK, (index + 1) * CHUNK))});
      await send({action:'ctxFinish', id});
    } catch (error) {
      try { await chrome.runtime.sendMessage({action:'ctxCancel', id}); } catch {}
      throw error;
    }
    return {ok:true, name};
  } catch (error) {
    return {ok:false, error:String(error?.message || error), sourceUrl:/^(https?:|file:)/i.test(address) ? address : ''};
  }
}
