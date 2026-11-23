'use strict';
const lastRedirect = new Map();
const bypassRedirect = new Map(); // Orijinal belgeyi bir kez normal tarayıcıda aç.
function isSupportedUrl(url) {
  try { return /^(https?:|file:)$/.test(new URL(url).protocol); }
  catch { return false; }
}
function isPdfPath(url) {
  try { return decodeURIComponent(new URL(url).pathname).toLowerCase().endsWith('.pdf'); }
  catch { return false; }
}
function isDocumentPath(url) {
  try { return /\.(?:pdf|jpe?g|png|webp|gif|bmp)$/i.test(decodeURIComponent(new URL(url).pathname)); }
  catch { return false; }
}
async function redirectToViewer(tabId, url) {
  if (!isSupportedUrl(url) || tabId < 0) return;
  const bypass = bypassRedirect.get(tabId);
  if (bypass) {
    if (Date.now() - bypass.at < 20000) return;
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
  if (info.url && isDocumentPath(info.url)) redirectToViewer(tabId, info.url);
});
chrome.tabs.onRemoved.addListener(tabId => { lastRedirect.delete(tabId); bypassRedirect.delete(tabId); });
chrome.webRequest.onHeadersReceived.addListener(details => {
  if (details.tabId < 0 || !isSupportedUrl(details.url)) return;
  const ctype = (details.responseHeaders || []).find(h => h.name.toLowerCase() === 'content-type')?.value || '';
  if (/^(application\/pdf|image\/(?:png|jpeg|webp|gif|bmp))\b/i.test(ctype.trim()))
    redirectToViewer(details.tabId, details.url);
}, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']}, ['responseHeaders']);

// A separate, user-clicked path is needed for Outlook images and OneDrive embedded previews.
// Never enumerate mailbox files or network responses in the background.
async function captureTarget(tabId, frameId=0, sourceUrl='') {
  if (!Number.isInteger(tabId) || tabId < 0 || !chrome.scripting?.executeScript)
    return {ok:false,error:'Bu sekmede güvenli dosya yakalama kullanılamıyor.'};
  const id = crypto.randomUUID();
  globalThis.__ocrPermitContext(id, tabId, frameId);
  try {
    const result = await chrome.scripting.executeScript({
      target:{tabId,frameIds:[frameId]},
      world:'ISOLATED',
      func:captureOcrAttachment,
      args:[{id,sourceUrl}]
    });
    return result?.[0]?.result || {ok:false,error:'Sayfadan dosya yanıtı alınamadı.'};
  } catch (error) {
    return {ok:false,error:'Sayfa içeriğine erişilemedi: '+String(error?.message||error)};
  }
}
async function reportCaptureFailure(error) {
  const note = String(error || 'Dosya açılamadı.').slice(0,500);
  await chrome.tabs.create({url:chrome.runtime.getURL('viewer.html')+'?captureError='+encodeURIComponent(note),active:true});
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.action === 'openOriginal' && isSupportedUrl(message.url)) {
    (async () => {
      const tab = await chrome.tabs.create({url:'about:blank',active:true});
      bypassRedirect.set(tab.id, {url:message.url,at:Date.now()});
      await chrome.tabs.update(tab.id, {url:message.url});
      respond({ok:true});
    })().catch(error => respond({ok:false,error:String(error)}));
    return true;
  }
  if (message?.action === 'openManual' && Number.isInteger(message.tabId) && isSupportedUrl(message.url)) {
    chrome.tabs.update(message.tabId, {url:chrome.runtime.getURL('viewer.html')+'?src='+encodeURIComponent(message.url)})
      .then(() => respond({ok:true}))
      .catch(e => respond({ok:false,error:String(e)}));
    return true;
  }
  if (message?.action === 'captureCurrent' && sender.url === chrome.runtime.getURL('popup.html')) {
    captureTarget(message.tabId,0,message.url && isDocumentPath(message.url) ? message.url : '')
      .then(respond).catch(e=>respond({ok:false,error:String(e)}));
    return true;
  }
});
chrome.runtime.onInstalled?.addListener(() => {
  chrome.contextMenus?.removeAll?.(() => chrome.contextMenus.create({
    id:'ocr-open-attachment',
    title:'PDF / görseli OCR ile aç',
    contexts:['image','link','page']
  }));
});
chrome.contextMenus?.onClicked?.addListener((info,tab) => {
  if(info.menuItemId!=='ocr-open-attachment'||!tab?.id)return;
  const address=info.srcUrl||info.linkUrl||'';
  captureTarget(tab.id,info.frameId??0,address)
    .then(result=>{if(!result.ok)return reportCaptureFailure(result.error);})
    .catch(err=>reportCaptureFailure(String(err)));
});

// The temporary IndexedDB bridge is shared with WhatsApp, but context capture is
// separately authorized for exactly one tab/frame and only after a user action.
if(typeof importScripts==='function')importScripts('whatsapp-transfer.js','attachment-capture.js');
