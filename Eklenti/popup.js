'use strict';
const $ = id => document.getElementById(id);
(async () => {const {autoOpen=true} = await chrome.storage.local.get({autoOpen:true});$('auto').checked=autoOpen;})();
$('auto').addEventListener('change',ev => chrome.storage.local.set({autoOpen:ev.target.checked}));
$('blank').onclick = () => chrome.tabs.create({url: chrome.runtime.getURL('viewer.html')});
$('current').onclick = async () => {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab?.id || !tab.url || !/^(https?:|file:)/.test(tab.url)) {
    $('msg').textContent='Bu sekmenin içeriğine erişilemiyor. Dosyayı indirip PDF seç ile açabilirsin.';
    return;
  }
  $('current').disabled=true;
  $('msg').textContent='Açık sekmede PDF veya görsel aranıyor...';
  try {
    const result=await chrome.runtime.sendMessage({action:'captureCurrent',tabId:tab.id,url:tab.url});
    if(result?.ok) window.close();
    else $('msg').textContent=(result?.error||'Dosya yakalanamadı.')+' Bağlantıya sağ tıklayarak da OCR ile açabilirsin.';
  } catch(error) {
    $('msg').textContent='OCR açılamadı: '+String(error?.message||error);
  } finally { $('current').disabled=false; }
};
