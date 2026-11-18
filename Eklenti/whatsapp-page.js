// WhatsApp Web MAIN-world adapter. Does nothing until the user explicitly arms capture.
// Never reads chats, message databases, account identifiers, or remote requests.
(() => {
  'use strict';
  if (window.__turkcePdfOcrWhatsappHook) return;
  window.__turkcePdfOcrWhatsappHook = true;
  const CHANNEL = 'turkce-pdf-ocr-whatsapp-v1';
  const MAX_BYTES = 32 * 1024 * 1024;
  let armed = null;
  let inFlight = false;

  function current() {
    if (!armed || Date.now() > armed.until) { armed = null; return null; }
    return armed;
  }
  function send(type, nonce, extra = {}, transfer) {
    window.postMessage({ channel: CHANNEL, type, nonce, ...extra },
      location.origin, transfer || []);
  }
  function isPdfSignature(buffer) {
    const b = new Uint8Array(buffer);
    return b.length >= 5 && b[0] === 37 && b[1] === 80 &&
      b[2] === 68 && b[3] === 70 && b[4] === 45;
  }
  function cleanName(value) {
    const raw = String(value || 'WhatsApp.pdf').split(/[\\/]/).pop().slice(0, 180);
    return (/\.pdf$/i.test(raw) ? raw : 'WhatsApp.pdf');
  }
  async function captureBlob(blob, name) {
    const session = current();
    if (!session || inFlight || !(blob instanceof Blob)) return false;
    if (blob.size < 5 || blob.size > MAX_BYTES) {
      if (blob.type.toLowerCase().includes('pdf'))
        send('error', session.nonce, { message: 'PDF 32 MB sınırını aşıyor. İndirip PDF seç ile aç.' });
      return false;
    }
    let head;
    try { head = await blob.slice(0, 5).arrayBuffer(); }
    catch { return false; }
    if (!isPdfSignature(head) || current()?.nonce !== session.nonce || inFlight) return false;
    inFlight = true;
    armed = null;
    try {
      const bytes = await blob.arrayBuffer();
      if (!isPdfSignature(bytes)) throw new Error('PDF başlığı geçersiz.');
      send('pdf', session.nonce, { name: cleanName(name), bytes }, [bytes]);
      return true;
    } catch (err) {
      send('error', session.nonce, { message: String(err?.message || err) });
      return false;
    } finally { inFlight = false; }
  }

  const originalObjectURL = URL.createObjectURL;
  URL.createObjectURL = function (object) {
    const url = originalObjectURL.apply(this, arguments);
    if (current() && object instanceof Blob && object.size <= MAX_BYTES) {
      // Observe only the next user-requested PDF; don't copy or retain other blobs.
      void captureBlob(object, 'WhatsApp.pdf');
    }
    return url;
  };

  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const url = this.href;
    const name = this.download || 'WhatsApp.pdf';
    if (!current() || !/^blob:/i.test(url)) return originalClick.apply(this, arguments);
    const anchor = this, args = arguments;
    // WhatsApp often creates a temporary blob anchor when the document is opened.
    // Test the bytes; preserve the original click if this is not a PDF.
    void fetch(url).then(response => {
      if (!response.ok) throw new Error('Blob okunamadı.');
      return response.blob();
    }).then(blob => captureBlob(blob, name))
      .then(captured => { if (!captured && !inFlight) originalClick.apply(anchor, args); })
      .catch(() => { if (!inFlight) originalClick.apply(anchor, args); });
  };

  async function checkAlreadyOpenPdf() {
    const elements = document.querySelectorAll('iframe[src^="blob:"],embed[src^="blob:"],object[data^="blob:"]');
    for (const element of Array.from(elements).slice(0, 8)) {
      if (!current() || inFlight) break;
      const url = element.src || element.data;
      try {
        const response = await fetch(url);
        if (response.ok && await captureBlob(await response.blob(), 'WhatsApp.pdf')) break;
      } catch { /* Browser PDF preview may not expose its blob. */ }
    }
  }

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (msg?.channel !== CHANNEL || msg?.type !== 'arm') return;
    if (typeof msg.nonce !== 'string' || !/^[0-9a-f-]{20,80}$/i.test(msg.nonce)) return;
    armed = { nonce: msg.nonce, until: Date.now() + 45000 };
    inFlight = false;
    void checkAlreadyOpenPdf();
  });
})();
