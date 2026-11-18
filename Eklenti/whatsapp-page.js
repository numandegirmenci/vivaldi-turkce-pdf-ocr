// WhatsApp Web main-world PDF observer.
// Passive until the user clicks "PDF OCR ile aç"; never reads chats or message history.
(() => {
  'use strict';
  if (window.__turkcePdfOcrWhatsappHook) return;
  window.__turkcePdfOcrWhatsappHook = true;

  const CHANNEL = 'turkce-pdf-ocr-whatsapp-v1';
  const MAX_BYTES = 32 * 1024 * 1024;
  const WAIT_MS = 45_000;
  let armed = null;
  let inFlight = false;
  let observer = null;
  let timer = null;

  function disconnectPreviewObserver() {
    observer?.disconnect();
    observer = null;
    if (timer) clearTimeout(timer);
    timer = null;
  }
  function disarm() {
    armed = null;
    disconnectPreviewObserver();
  }
  function current() {
    if (!armed) return null;
    if (Date.now() >= armed.until) { disarm(); return null; }
    return armed;
  }
  function send(type, nonce, detail = {}, bytes = null) {
    window.postMessage(
      { channel: CHANNEL, type, nonce, ...detail },
      location.origin,
      bytes ? [bytes] : []
    );
  }
  function signature(bytes) {
    const b = new Uint8Array(bytes);
    return b.length >= 5 && b[0] === 37 && b[1] === 80 &&
      b[2] === 68 && b[3] === 70 && b[4] === 45;
  }
  function filename(value) {
    const valueString = String(value || '').split(/[\\/]/).pop().slice(0, 180);
    return /\.pdf$/i.test(valueString) ? valueString : 'WhatsApp.pdf';
  }

  async function captureBlob(blob, name = 'WhatsApp.pdf') {
    const session = current();
    if (!session || inFlight || !(blob instanceof Blob)) return false;
    if (blob.size > MAX_BYTES) {
      if (/pdf/i.test(blob.type || '')) {
        disarm();
        send('error', session.nonce, { message: 'PDF 32 MB sınırını aşıyor. İndirip PDF seç ile aç.' });
      }
      return false;
    }
    if (blob.size < 5) return false;
    let header;
    try { header = await blob.slice(0, 5).arrayBuffer(); }
    catch { return false; }
    if (!signature(header) || inFlight || current()?.nonce !== session.nonce) return false;

    // Only the first valid PDF of this 45-second explicit capture window wins.
    inFlight = true;
    disarm();
    try {
      const bytes = await blob.arrayBuffer();
      if (!signature(bytes)) throw new Error('PDF başlığı okunamadı.');
      send('pdf', session.nonce, { name: filename(name), bytes }, bytes);
      return true;
    } catch (error) {
      send('error', session.nonce, { message: String(error?.message || error) });
      return false;
    } finally {
      inFlight = false;
    }
  }

  function captureUrl(url, name = 'WhatsApp.pdf') {
    if (!current() || !/^blob:/i.test(String(url || ''))) return;
    // Start reading *before* WhatsApp may revoke a temporary URL. Never block its click.
    void Promise.resolve().then(() => fetch(url))
      .then(response => {
        if (!response.ok) throw new Error('PDF bağlantısına erişilemiyor.');
        return response.blob();
      })
      .then(blob => captureBlob(blob, name))
      .catch(() => { /* normal WhatsApp behaviour stays intact */ });
  }

  // WhatsApp may create the PDF blob when the user selects "PDF düzenle".
  const originalObjectURL = URL.createObjectURL;
  URL.createObjectURL = function(object) {
    const url = originalObjectURL.apply(this, arguments);
    if (current() && object instanceof Blob) void captureBlob(object, 'WhatsApp.pdf');
    return url;
  };

  // Older cached URLs can be reused without creating another Blob.
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(...args) {
    if (current()) captureUrl(this.href, this.download || 'WhatsApp.pdf');
    return originalClick.apply(this, args); // synchronous native behaviour, never delayed
  };

  // Also detects ordinary mouse/keyboard clicks (not only anchor.click()).
  document.addEventListener?.('click', event => {
    if (!current()) return;
    const node = event.target;
    const link = node?.closest?.('a[href^="blob:"]');
    if (link) captureUrl(link.href, link.download || 'WhatsApp.pdf');
  }, true);

  if (typeof window.open === 'function') {
    const originalOpen = window.open;
    window.open = function(url, ...args) {
      if (current()) captureUrl(url, 'WhatsApp.pdf');
      return originalOpen.call(this, url, ...args);
    };
  }

  function inspectPreview(root = document) {
    if (!current() || inFlight) return;
    const selector = 'iframe[src^="blob:"],embed[src^="blob:"],object[data^="blob:"]';
    const entries = root.querySelectorAll?.(selector) || [];
    for (const node of Array.from(entries).slice(0, 8)) {
      const url = node.src || node.data;
      if (url) captureUrl(url, 'WhatsApp.pdf');
    }
    if (root.matches?.(selector)) {
      const url = root.src || root.data;
      if (url) captureUrl(url, 'WhatsApp.pdf');
    }
  }
  function watchPreview() {
    inspectPreview();
    if (typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver(records => {
      if (!current()) return;
      for (const record of records) {
        if (record.type === 'attributes') inspectPreview(record.target);
        for (const node of record.addedNodes || []) {
          if (node.nodeType === 1) inspectPreview(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['src', 'data']
    });
  }

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (msg?.channel !== CHANNEL) return;
    if (msg.type === 'cancel') {
      if (current()?.nonce === msg.nonce) disarm();
      return;
    }
    if (msg.type !== 'arm' || inFlight) return;
    if (typeof msg.nonce !== 'string' || !/^[0-9a-f-]{20,80}$/i.test(msg.nonce)) return;
    disarm(); // reset previous observers and expiry before every new attempt
    armed = { nonce: msg.nonce, until: Date.now() + WAIT_MS };
    timer = setTimeout(disarm, WAIT_MS + 100);
    watchPreview();
  });
})();
