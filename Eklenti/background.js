'use strict';
const lastRedirect = new Map();
const bypassRedirect = new Map(); // Orijinal PDF'yi bir kerelik Vivaldi görüntüleyicisinde aç.
function isSupportedUrl(url) {
  try { return /^(https?:|file:)$/.test(new URL(url).protocol); }
  catch { return false; }
}
function isPdfPath(url) {
  try { return decodeURIComponent(new URL(url).pathname).toLowerCase().endsWith('.pdf'); }
  catch { return false; }
}
async function redirectToViewer(tabId, url) {
  if (!isSupportedUrl(url) || tabId < 0) return;
  const bypass = bypassRedirect.get(tabId);
  if (bypass) {
    if (Date.now() - bypass.at < 20000) return; // PDF adresi yönlendirilse de orijinal sekme açılsın.
    bypassRedirect.delete(tabId);
  }
  const prev = lastRedirect.get(tabId);
  if (prev && prev.url === url && Date.now() - prev.at < 6000) return;
  const { autoOpen = true } = await chrome.storage.local.get({autoOpen: true});
  if (!autoOpen) return;
  lastRedirect.set(tabId, {url, at: Date.now()});
  try { await chrome.tabs.update(tabId, {url: chrome.runtime.getURL('viewer.html') + '?src=' + encodeURIComponent(url)}); }
  catch (error) { console.warn('PDF OCR yönlendirmesi başarısız:', error); }
}
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url && isPdfPath(info.url)) redirectToViewer(tabId, info.url);
});
chrome.tabs.onRemoved.addListener(tabId => { lastRedirect.delete(tabId); bypassRedirect.delete(tabId); });
chrome.webRequest.onHeadersReceived.addListener(details => {
  if (details.tabId < 0 || !isSupportedUrl(details.url)) return;
  const ctype = (details.responseHeaders || []).find(h => h.name.toLowerCase() === 'content-type')?.value || '';
  if (/^application\/pdf\b/i.test(ctype.trim())) redirectToViewer(details.tabId, details.url);
}, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']}, ['responseHeaders']);
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.action === 'openOriginal' && isSupportedUrl(message.url)) {
    (async () => {
      const tab = await chrome.tabs.create({ url: 'about:blank', active: true });
      bypassRedirect.set(tab.id, { url: message.url, at: Date.now() });
      await chrome.tabs.update(tab.id, { url: message.url });
      respond({ ok: true });
    })().catch(error => respond({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.action === 'openManual' && Number.isInteger(message.tabId) && isSupportedUrl(message.url)) {
    chrome.tabs.update(message.tabId, {url: chrome.runtime.getURL('viewer.html') + '?src=' + encodeURIComponent(message.url)})
      .then(() => respond({ok:true}))
      .catch(e => respond({ok:false,error:String(e)}));
    return true;
  }
});

// Only WhatsApp's user-triggered PDF bridge uses the temporary extension-origin store.
if (typeof importScripts === 'function') importScripts('whatsapp-transfer.js');
