'use strict';
const $ = id => document.getElementById(id);
(async () => {const {autoOpen=true} = await chrome.storage.local.get({autoOpen:true});$('auto').checked=autoOpen;})();
$('auto').addEventListener('change',ev => chrome.storage.local.set({autoOpen:ev.target.checked}));
$('blank').onclick = () => chrome.tabs.create({url: chrome.runtime.getURL('viewer.html')});
$('current').onclick = async () => {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab?.url || !/^(https?:|file:)/.test(tab.url)) { $('msg').textContent='Bu sekme bir PDF adresi olmayabilir. Dosya seç düğmesini kullan.'; return; }
  // Opening a normal website as if it were a PDF causes confusing errors.
  if (!/\.pdf(?:[?#]|$)/i.test(tab.url)) {
    $('msg').textContent='Bu sekmenin adresi PDF dosyası gibi görünmüyor. PDF seç düğmesini kullan.';
    return;
  }
  const result = await chrome.runtime.sendMessage({action:'openManual',tabId:tab.id,url:tab.url});
  if (!result?.ok) $('msg').textContent=result?.error||'Açma işlemi başarısız.';
  else window.close();
};
