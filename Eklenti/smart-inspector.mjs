/**
 * Smart region inspection: original / enhanced / candidate texts side by side.
 * Does not modify the page pixels. All suspicious guesses require review.
 */
import {REGION_LABELS,normalizeRegion,regionFeatures,wordOverlap,
  classifyRegion,discoverRegions} from './smart-regions.mjs';
import {regionBitmapFromCanvas,preprocessRegionPixels,canvasFromPixels,
  highResolutionRegion} from './smart-image.mjs';
import {createRegionJobs,recognizeRegionJobs,confidenceLabel} from './smart-reader.mjs';

export function installSmartInspector({$,state,status,ensurePage,runOcrJobs,
  disableVisualEditor,updateExtractedText,getCurrentPageText}) {
  const ui={
    open:$('smartAnalyze'),panel:$('smartInspector'),close:$('smartClose'),
    detect:$('smartDetect'),select:$('smartSelect'),
    list:$('smartRegionList'),detail:$('smartRegionDetail'),
    type:$('smartRegionType'),original:$('smartOriginal'),enhanced:$('smartEnhanced'),
    stats:$('smartStats'),read:$('smartRead'),htr:$('smartHtr'),
    advanced:$('smartAdvanced'),results:$('smartResults'),
    candidates:$('smartCandidates'),verified:$('smartVerified'),
    add:$('smartAppend')
  };
  let current=null,regions=[],selecting=false,busy=false,epoch=0;
  const showStatus=(message,error=false)=>{
    ui.results.textContent=message;
    ui.results.classList.toggle('smart-error',error);
    status(message,error);
  };
  const setBusy=value=>{
    busy=value;
    for(const b of [ui.read,ui.htr,ui.detect,ui.select,ui.add])
      b.disabled=value||(!current&&(b===ui.read||b===ui.htr||b===ui.add));
  };
  function drawPreview(source,destination){
    destination.width=source.width;
    destination.height=source.height;
    const ctx=destination.getContext('2d');
    ctx.clearRect(0,0,destination.width,destination.height);
    ctx.drawImage(source,0,0);
  }
  function previewMode(kind){
    return kind==='handwriting'?'blue-pen':kind==='stamp'?'stamp':
      kind==='print'?'contrast':'paper';
  }
  function clearMark(){
    for(const view of state.sheets)
      view.smartMark?.remove();
  }
  function mark(view,box){
    clearMark();
    const div=document.createElement('div');
    div.className='smart-active-region';
    div.style.left=box.x0+'px';div.style.top=box.y0+'px';
    div.style.width=(box.x1-box.x0)+'px';
    div.style.height=(box.y1-box.y0)+'px';
    div.style.pointerEvents='none';
    view.surface.append(div);view.smartMark=div;
  }
  function reset(){
    epoch++;busy=false;current=null;regions=[];selecting=false;
    clearMark();ui.panel.hidden=true;ui.detail.hidden=true;
    ui.open.disabled=!state.pdf;
    ui.select.setAttribute('aria-pressed','false');
    ui.select.textContent='▱ Fareyle alan seç';
    ui.list.replaceChildren();ui.results.textContent='';
    ui.verified.value='';ui.candidates.replaceChildren();
    setBusy(false);
  }
  async function readyView(view){
    if(!view)throw new Error('Sayfa seçilmedi.');
    await ensurePage(view);
    if(!view.canvas)throw new Error('Sayfa görüntüsü yüklenemedi.');
    return view;
  }
  async function pick(view,box,region=null){
    const token=++epoch;
    await readyView(view);
    const rect=normalizeRegion(box,view.canvas.width,view.canvas.height);
    mark(view,rect);
    ui.panel.hidden=false;ui.detail.hidden=false;
    ui.verified.value='';ui.candidates.replaceChildren();
    ui.results.textContent='Bölge hazırlanıyor...';
    const highRes=await highResolutionRegion(view,rect,{factor:2.8});
    if(epoch!==token)return;
    const raw=regionBitmapFromCanvas(view.canvas,rect);
    const terms=wordOverlap(view.words,rect);
    const features=regionFeatures(raw,terms);
    const guess=region?.kind?{kind:region.kind,certainty:region.certainty,
      reason:region.reason,manual:region.manual}:classifyRegion(features);
    current={view,box:rect,highRes,features,guess,result:null};
    ui.type.value=guess.kind;
    ui.stats.textContent=REGION_LABELS[guess.kind]+' · '+guess.reason+
      ' (bölge sınıflandırması tahmini) · '+terms.length+' OCR kelimesi';
    drawPreview(highRes.canvas,ui.original);
    refreshEnhanced();
    ui.results.textContent='Özgün ve iyileştirilmiş görüntü hazır. "Bölgeyi oku" ile çoklu OCR başlat.';
    ui.htr.disabled=guess.kind!=='handwriting';
    ui.add.disabled=false;
    ui.panel.scrollIntoView({block:'nearest'});
  }
  function refreshEnhanced(){
    if(!current)return;
    const kind=ui.type.value;
    const source=current.highRes.canvas;
    const pixels=source.getContext('2d',{willReadFrequently:true})
      .getImageData(0,0,source.width,source.height);
    const improved=canvasFromPixels(preprocessRegionPixels(pixels,previewMode(kind)));
    drawPreview(improved,ui.enhanced);
    improved.width=0;improved.height=0;
    ui.htr.disabled=busy||kind!=='handwriting';
    ui.read.disabled=busy||kind==='signature';
    if(kind==='signature'){
      ui.results.textContent='İmza bölgesinde metin uydurulmaz. Görseli inceleyebilir ve türü değiştirebilirsin.';
    }
  }
  function candidateCards(candidates){
    ui.candidates.replaceChildren();
    const title=document.createElement('strong');
    title.textContent='Okuma alternatifleri (tıklayarak seç)';
    ui.candidates.append(title);
    if(!candidates.length){const note=document.createElement('p');
      note.textContent='Güvenilir metin üretilemedi.';ui.candidates.append(note);}
    for(const item of candidates){
      const button=document.createElement('button');
      button.className='smart-candidate';
      const strength=item.confidence===null?'güven puanı yok':Math.round(item.confidence)+'%';
      button.textContent=item.name+' ('+strength+'): '+item.text;
      button.title='Bu adayı incelemek için metin alanına taşı';
      button.addEventListener('click',()=>{ui.verified.value=item.text;});
      ui.candidates.append(button);
    }
  }
  async function readCurrent(){
    if(!current||busy)return;
    const chosen=current,token=epoch;
    const kind=ui.type.value;
    if(kind==='signature'){
      showStatus('İmza görseli metin gibi okunmaz. İstersen bölge türünü değiştirebilirsin.',true);
      return;
    }
    setBusy(true);
    try{
      const jobs=createRegionJobs(chosen.highRes.canvas,kind,{advanced:ui.advanced.checked});
      const result=await recognizeRegionJobs(jobs,runOcrJobs,showStatus);
      if(epoch!==token)return;
      chosen.result=result;
      candidateCards(result.candidates);
      ui.verified.value=result.uncertain?'':result.text;
      showStatus(confidenceLabel(result)+
        (result.uncertain?' En iyi aday: '+(result.proposed||'yok'):'')+
        ' · '+result.confidence+'/100',result.uncertain);
    }catch(error){
      showStatus('Bölge OCR hatası: '+error.message,true);
    }finally{setBusy(false);}
  }
  async function readHandwritten(){
    if(!current||busy||ui.type.value!=='handwriting')return;
    const agree=window.confirm(
      'El yazısı için ayrı TrOCR modeli ilk kullanımda internetten indirilecektir. '+
      'Model ağırlıkları cihazda saklanır, belgenin görüntüsü sunucuya gönderilmez. '+
      'Model İngilizce odaklıdır; Türkçe karakterler yanlış olabilir. Devam edilsin mi?');
    if(!agree)return;
    const token=epoch,chosen=current;setBusy(true);
    try{
      showStatus('Yerel el yazısı modeli hazırlanıyor...');
      const module=await import('./vendor/handwriting-runtime.mjs');
      if(epoch!==token)return;
      const result=await module.recognizeHandwriting(chosen.highRes.canvas.toDataURL('image/png'),showStatus);
      if(epoch!==token)return;
      if(result.text){
        candidateCards([...(chosen.result?.candidates||[]),
          {name:'TrOCR · İngilizce ağırlıklı el yazısı modeli',text:result.text,confidence:null}]);
        showStatus('Model bir aday üretti: '+result.text+
          ' · Türkçe doğruluğu belirsiz; inceleyip elle onayla.',true);
      }else showStatus('El yazısı modeli güvenilir bir metin üretemedi.',true);
    }catch(error){
      showStatus('El yazısı modeli çalıştırılamadı: '+error.message+
        '. Çoklu yerel Tesseract OCR ile devam edebilirsin.',true);
    }finally{setBusy(false);}
  }
  async function detectCurrent(){
    if(busy)return;
    ui.panel.hidden=false;ui.detail.hidden=true;
    const view=state.sheets[state.activePage-1]||state.sheets[0];
    const token=++epoch;
    ui.list.textContent='Sayfa analiz ediliyor...';
    try{
      await readyView(view);
      if(epoch!==token)return;
      const pixels=view.canvas.getContext('2d',{willReadFrequently:true})
        .getImageData(0,0,view.canvas.width,view.canvas.height);
      regions=discoverRegions(pixels,view.words,30).map(r=>({...r,view}));
      ui.list.replaceChildren();
      for(const region of regions){
        const button=document.createElement('button');
        button.className='smart-region-item';
        const caption=region.words.slice(0,3).map(w=>w.text).join(' ').slice(0,65);
        button.textContent=REGION_LABELS[region.kind]+
          ' · '+Math.round(region.certainty*100)+'% tahmin'+
          (caption?' · '+caption:'');
        button.title=region.reason+' · Bölgeyi yakından incele';
        button.addEventListener('click',()=>pick(region.view,region.pageBox,region)
          .catch(e=>showStatus('Bölge açılamadı: '+e.message,true)));
        ui.list.append(button);
      }
      if(!regions.length)ui.list.textContent='Otomatik bölge bulunamadı. Fareyle alan seçebilirsin.';
      status('Sayfa '+view.index+': '+regions.length+
        ' inceleme bölgesi bulundu. Kaşe/el yazısı türleri tahminidir.');
    }catch(error){
      showStatus('Bölge analizi başarısız: '+error.message,true);
    }
  }
  function toggleSelecting(){
    selecting=!selecting;
    if(selecting)disableVisualEditor();
    ui.select.setAttribute('aria-pressed',String(selecting));
    ui.select.textContent=selecting?'✓ Alan seçimi açık':'▱ Fareyle alan seç';
    $('pages').classList.toggle('smart-selecting',selecting);
    status(selecting?'Belgedeki yazı, kaşe veya el yazısının çevresini fareyle işaretle.':
      'Bölge seçimi kapatıldı.');
  }
  function attach(view){
    let start=null,ghost=null;
    const pos=event=>{
      const rect=view.surface.getBoundingClientRect();
      return {x:Math.max(0,Math.min(view.width,
        (event.clientX-rect.left)*view.width/Math.max(1,rect.width))),
        y:Math.max(0,Math.min(view.height,
        (event.clientY-rect.top)*view.height/Math.max(1,rect.height)))};
    };
    view.surface.addEventListener('pointerdown',event=>{
      if(!selecting||event.button!==0||!view.canvas)return;
      event.preventDefault();event.stopPropagation();
      start={...pos(event),id:event.pointerId};
      ghost=document.createElement('div');ghost.className='smart-region-ghost';
      view.surface.append(ghost);
      try{view.surface.setPointerCapture(event.pointerId);}catch{}
    });
    view.surface.addEventListener('pointermove',event=>{
      if(!start||start.id!==event.pointerId||!ghost)return;
      const p=pos(event);
      const x=Math.min(p.x,start.x),y=Math.min(p.y,start.y);
      ghost.style.left=x+'px';ghost.style.top=y+'px';
      ghost.style.width=Math.abs(p.x-start.x)+'px';
      ghost.style.height=Math.abs(p.y-start.y)+'px';
    });
    view.surface.addEventListener('pointerup',event=>{
      if(!start||start.id!==event.pointerId)return;
      const p=pos(event),b=start;start=null;
      ghost?.remove();ghost=null;
      try{view.surface.releasePointerCapture(event.pointerId);}catch{}
      if(Math.abs(p.x-b.x)<16||Math.abs(p.y-b.y)<9)return;
      toggleSelecting();
      pick(view,{x0:b.x,y0:b.y,x1:p.x,y1:p.y})
        .catch(error=>showStatus('Bölge seçilemedi: '+error.message,true));
    });
    view.surface.addEventListener('pointercancel',()=>{start=null;ghost?.remove();ghost=null;});
  }
  ui.open.addEventListener('click',()=>{ui.panel.hidden=false;detectCurrent();});
  ui.detect.addEventListener('click',detectCurrent);
  ui.select.addEventListener('click',toggleSelecting);
  ui.close.addEventListener('click',()=>{
    ui.panel.hidden=true;
    if(selecting)toggleSelecting();
    clearMark();
  });
  ui.type.addEventListener('change',()=>{
    if(!current)return;
    current.guess={kind:ui.type.value,certainty:1,manual:true,reason:'Kullanıcı seçimi'};
    refreshEnhanced();
  });
  ui.read.addEventListener('click',readCurrent);
  ui.htr.addEventListener('click',readHandwritten);
  ui.add.addEventListener('click',()=>{
    const text=ui.verified.value.trim();
    if(!current||!text){showStatus('Önce OCR adayını kontrol edip metni doğrula.',true);return;}
    if(text.length>600) {showStatus('Bölge notu çok uzun (en fazla 600 karakter).',true);return;}
    const view=current.view;
    view.smartNotes??=[];
    const note='[Kullanıcı doğruladı · '+REGION_LABELS[ui.type.value]+'] '+text;
    if(!view.smartNotes.includes(note))view.smartNotes.push(note);
    const suffix='\n'+view.smartNotes.join('\n');
    state.pages[view.index-1]=getCurrentPageText(view)+suffix;
    updateExtractedText();
    showStatus('Doğruladığın bölge metni ayrı not olarak çıkarılan metne eklendi. Kaynak PDF değişmedi.');
  });
  reset();
  return {reset,attach,refreshView(view){
    if(!ui.panel.hidden&&view.index===state.activePage&&regions.length)detectCurrent();
  },getNotes:view=>view?.smartNotes?.length?'\n'+view.smartNotes.join('\n'):'',
    getCurrent:()=>current};
}
