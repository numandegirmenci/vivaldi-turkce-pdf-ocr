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

(async () => {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab?.id || !tab.url?.startsWith('https://web.whatsapp.com/')) return;

  $('whatsapp').hidden=false;
  $('blank').textContent='Dosyadan seç';
  $('current').hidden=true;
  let running=false,renderedFiles;
  function render(state) {
    $('wa-toggle').textContent=state.armed?'Yakalamayı kapat':'Yakalamayı aç';
    $('wa-toggle').disabled=state.transferring;
    $('wa-preview').hidden=!state.armed;
    $('wa-preview').disabled=state.transferring;
    $('wa-status').textContent=state.error||state.status||'';
    const fileState=JSON.stringify([state.transferring,state.files]);
    if(fileState===renderedFiles)return;
    renderedFiles=fileState;
    const files=$('wa-files');
    files.replaceChildren();
    if(state.files.length){
      const label=document.createElement('h3');
      label.textContent='Son dosyalar';
      files.append(label);
    }
    for(const file of state.files){
      const button=document.createElement('button');
      button.type='button';
      button.textContent=file.name;
      button.disabled=state.transferring;
      button.onclick=()=>control('reopen',file.id);
      files.append(button);
    }
  }
  async function control(command,id) {
    if(running)return;
    running=true;
    try {
      const state=await chrome.tabs.sendMessage(tab.id,{action:'whatsappControl',command,id});
      render(state);
      if(command==='reopen'&&state.ok)window.close();
    } catch {
      $('wa-status').textContent='Yakalama menüsü bağlanamadı. WhatsApp sekmesini yenileyip tekrar aç.';
    } finally {
      running=false;
    }
  }
  $('wa-toggle').onclick=()=>control('toggle');
  $('wa-preview').onclick=()=>control('captureVisible');
  await control('state');
  // Keep status and recent files current while this popup remains open.
  setInterval(()=>control('state'),1000);
})();
