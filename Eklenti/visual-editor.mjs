import {clampBox,normalizeVisibleEdit,fitVisibleText,textWithVisibleEdits} from './visual-edits.mjs';
import {SCAN_FONTS,nearestSameLineWord,findUnselectedOverlap,fullySelectedWords,analyzeScanTypography,renderScanReplacement} from './scan-typography.mjs';
import {formatOcrWords} from './text-utils.mjs';
import {createEditedPdf,saveBytesAsPdf} from './export-pdf.mjs';
import {sampleCanvasTextStyle} from './text-style.mjs';
import {prepareEditCandidates} from './edit-geometry.mjs';

/** User-triggered, reversible visual edits. No network calls or automatic document rewriting. */
export function installVisualEditor({$,state,status,updateExtractedText,refreshText}) {
  let enabled=false, selection=null, undoStack=[];
  const mode=$('editVisible'),panel=$('visualEditor'),label=$('editLocation');
  const text=$('editText'),detected=$('editDetectedStyle'),feedback=$('editFeedback');
  const reportEdit=(message,isError=false)=>{
    feedback.textContent=message;
    feedback.hidden=!message;
    feedback.classList.toggle('edit-feedback-error',isError);
  };
  const inkPreview=$('editInkPreview'),fillPreview=$('editFillPreview');
  const save=$('editApply'),remove=$('editRemove'),cancel=$('editCancel');
  const exportButton=$('exportEdited'),undo=$('editUndo'),compare=$('editCompare');
  let showingOriginal=false;
  compare.addEventListener('click',()=>{
    showingOriginal=!showingOriginal;
    $('pages').classList.toggle('show-original',showingOriginal);
    compare.textContent=showingOriginal?'✓ Düzenlenmişi göster':'👁 Orijinali göster';
    compare.setAttribute('aria-pressed',String(showingOriginal));
    status(showingOriginal?'Orijinal görüntü gösteriliyor. Düzenlemelerin kaybolmadı.':
      'Düzenlenmiş görüntü gösteriliyor.');
  });
  const measure=document.createElement('canvas').getContext('2d');
  // Loading font faces before measuring prevents browser fallback from distorting edits.
  let fontReady=null;
  const ensureFonts=()=>fontReady||(fontReady=Promise.allSettled(
    SCAN_FONTS.map(({family,weight})=>document.fonts.load(weight+' 24px "'+family+'"'))
  ));
  const hasEdits=()=>state.sheets.some(v=>v.edits?.length);
  const measureAtOne=value=>{
    if(!measure)return String(value).length*.54;
    measure.font='100px NotoSansOcr, Arial, sans-serif';
    return measure.measureText(value).width/100;
  };
  const toggle=active=>{
    enabled=Boolean(active&&state.pdf);
    mode.setAttribute('aria-pressed',String(enabled));
    mode.textContent=enabled?'✓ Yazı düzenleme açık':'✏️ Görünen yazıyı düzenle';
    $('pages').classList.toggle('visual-edit-enabled',enabled);
    // A search highlight made BELEDİYE look yellow in the screenshot.
    // Editing must show only original pixels, not the yellow search overlay.
    if(enabled&&$('searchInput')?.value){
      $('searchInput').value='';
      $('searchInput').dispatchEvent(new Event('input'));
    }
    if(!enabled){selection=null;panel.hidden=true;}
    status(enabled?'Düzenleme açık: kelimeye tıkla. Özel alan için Shift tuşunu basılı tutup fareyle sürükle.':'Yazı düzenleme kapatıldı.');
  };
  mode.addEventListener('click',()=>toggle(!enabled));
  function syncControls(){
    const count=state.sheets.reduce((n,v)=>n+(v.edits?.length||0),0);
    $('editCount').textContent=count?count+' görsel değişiklik':'Henüz değişiklik yok';
    exportButton.disabled=!state.pdf||count===0||state.busy;
    undo.disabled=!undoStack.length;
    compare.disabled=count===0;
    if(!count&&showingOriginal){showingOriginal=false;$('pages').classList.remove('show-original');}
    compare.textContent=showingOriginal?'✓ Düzenlenmişi göster':'👁 Orijinali göster';
  }
  function reset(){
    enabled=false;selection=null;undoStack=[];showingOriginal=false;
    $('pages').classList.remove('show-original');
    $('pages').classList.remove('visual-edit-enabled');
    mode.setAttribute('aria-pressed','false');
    mode.textContent='✏️ Görünen yazıyı düzenle';
    mode.disabled=!state.pdf;
    panel.hidden=true;syncControls();
  }
  function pageText(view) {
    const result=textWithVisibleEdits(view.baseText||'',view);
    if(typeof result==='string')return result;
    const body=formatOcrWords(result.words);
    return [body,...result.extra].filter(Boolean).join('\n');
  }
  function syncPage(view){
    state.pages[view.index-1]=pageText(view)+(view.smartNotes?.length?'\n'+view.smartNotes.join('\n'):'');
    updateExtractedText();
    refreshText();
    paint(view);
    syncControls();
  }
  function getPoint(view,event) {
    const rect=view.surface.getBoundingClientRect();
    const sx=view.width/Math.max(.01,rect.width),sy=view.height/Math.max(.01,rect.height);
    return {x:Math.max(0,Math.min(view.width,(event.clientX-rect.left)*sx)),
      y:Math.max(0,Math.min(view.height,(event.clientY-rect.top)*sy))};
  }
  function elementBox(view,element){
    const page=view.surface.getBoundingClientRect(),r=element.getBoundingClientRect();
    return clampBox({x0:(r.left-page.left)*view.width/page.width,
      y0:(r.top-page.top)*view.height/page.height,
      x1:(r.right-page.left)*view.width/page.width,
      y1:(r.bottom-page.top)*view.height/page.height},view.width,view.height);
  }
  function select(view,choice){
    if(!enabled)return;
    if(view.rotation||view.page.rotate){
      status('Döndürülmüş sayfalarda görsel yazı düzenleme henüz desteklenmiyor.',true);return;
    }
    try{
      const box=clampBox(choice.box,view.width,view.height);
      const existing=choice.id?view.edits.find(e=>e.id===choice.id):null;
      // Sample the closest word on the SAME line. A neighboring heading word
      // is a better typography reference than a short or malformed OCR target.
      const untouchedWords=(view.words||[]).filter(word=>!(view.edits||[]).some(edit=>{
        const r=word?.bbox,e=edit.box;
        return r&&e&&r.x0<e.x1&&r.x1>e.x0&&r.y0<e.y1&&r.y1>e.y0;
      }));
      const reference=nearestSameLineWord(untouchedWords,box);
      // Paper color MUST come from the target, not from an unrelated nearby
      // text region (or the yellow search highlight painted on top of the canvas).
      let targetStyle={ink:'#172b3d',fill:'#ffffff',bold:false,confidence:0,texture:false};
      let referenceStyle=null;
      if(!existing){
        try{targetStyle=sampleCanvasTextStyle(view.canvas,box,choice.original||'');}
        catch(error){console.warn('Hedef yazı görünümü okunamadı:',error);}
        if(reference){
          try{referenceStyle=sampleCanvasTextStyle(view.canvas,reference.bbox,reference.text);}
          catch(error){console.warn('Aynı satır örneği okunamadı:',error);}
        }
      }
      const sampled={...targetStyle,
        ink:referenceStyle?.confidence>=.55?referenceStyle.ink:targetStyle.ink,
        bold:referenceStyle?.confidence>=.55?referenceStyle.bold:targetStyle.bold,
        confidence:Math.max(targetStyle.confidence,referenceStyle?.confidence||0)};
      const style=existing?{
        ink:existing.ink,fill:existing.fill,bold:existing.bold,
        confidence:existing.styleConfidence,texture:existing.texturedBackground
      }:sampled;
      selection={view,...choice,box,
        sampleReference:reference?.text||null,
        fontSize:existing?.fontSize||Math.max(8,Math.min(80,(box.y1-box.y0)*1.1)),
        ink:style.ink,fill:style.fill,bold:Boolean(style.bold),
        styleConfidence:style.confidence||0,texturedBackground:Boolean(style.texture)};
      text.value=existing?.text??choice.original??'';
      reportEdit('');
      inkPreview.style.backgroundColor=style.ink;
      fillPreview.style.backgroundColor=style.fill;
      const confidence=style.confidence>=.55?'yaklaşık eşleşme':'belirsiz örnek';
      detected.textContent='Belgeden otomatik: '+style.ink.toUpperCase()+
        ' yazı · '+style.fill.toUpperCase()+' zemin · '+
        (reference?'Aynı satırdan örnek: '+reference.text+' · ':'')+
        confidence+(style.texture?' · dokulu zemin':'');
      label.textContent='Sayfa '+view.index+' · '+
        (existing?'Değişikliği düzenle':choice.sourceKind==='manual'?'Seçilen alan':'Tanınan yazı');
      remove.hidden=!existing;panel.hidden=false;
      text.focus({preventScroll:true});text.select();
    }catch(error){status('Alan seçilemedi: '+error.message,true);}
  }
  function getOriginalForBox(view,box){
    return fullySelectedWords(view.words,box);
  }
  function attach(view){
    view.edits=[];
    view.editLayer=null;
    let start=null,ghost=null,suppressedClick=false;
    view.surface.addEventListener('click',event=>{
      if(!enabled||suppressedClick)return;
      const previous=event.target.closest?.('[data-visible-edit-id]');
      if(previous&&view.surface.contains(previous)){
        const e=view.edits.find(item=>item.id===previous.dataset.visibleEditId);
        if(e)select(view,{...e});
        return;
      }
      const span=event.target.closest?.('.ocr-layer span, .textLayer span');
      if(!span||!view.surface.contains(span))return;
      try{
        const sourceKind=span.closest('.ocr-layer')?'ocr':'native';
        const sourceIndex=sourceKind==='ocr'?Number(span.dataset.ocrIndex):null;
        const bbox=sourceKind==='ocr'&&Number.isInteger(sourceIndex)&&view.words[sourceIndex]
          ?view.words[sourceIndex].bbox:elementBox(view,span);
        select(view,{box:bbox,original:span.textContent.trim(),sourceKind,
          sourceIndex:sourceKind==='ocr'?sourceIndex:null,
          sourceIndices:sourceKind==='ocr'?[sourceIndex]:[]});
      }catch(error){status('Yazı seçilemedi: '+error.message,true);}
    });
    const clearGhost=()=>{ghost?.remove();ghost=null;};
    view.surface.addEventListener('pointerdown',event=>{
      if(!enabled||event.button!==0||!view.canvas)return;
      // Shift+drag deliberately starts a custom region over OCR text.
      // Without Shift, a plain click still edits the whole detected word.
      if(event.target.closest?.('[data-visible-edit-id]'))return;
      if(!event.shiftKey&&event.target.closest?.('.ocr-layer span, .textLayer span'))return;
      if(view.rotation||view.page.rotate){status('Döndürülmüş sayfada alan seçimi desteklenmiyor.',true);return;}
      start={...getPoint(view,event),pointerId:event.pointerId};
      clearGhost();
      ghost=document.createElement('div');ghost.className='visual-edit-ghost';
      view.surface.append(ghost);
      try{view.surface.setPointerCapture(event.pointerId);}catch{}
      event.preventDefault();
    });
    view.surface.addEventListener('pointermove',event=>{
      if(!start||event.pointerId!==start.pointerId||!ghost)return;
      const end=getPoint(view,event),x0=Math.min(start.x,end.x),y0=Math.min(start.y,end.y);
      ghost.style.left=x0+'px';ghost.style.top=y0+'px';
      ghost.style.width=Math.abs(start.x-end.x)+'px';
      ghost.style.height=Math.abs(start.y-end.y)+'px';
    });
    view.surface.addEventListener('pointerup',event=>{
      if(!start||event.pointerId!==start.pointerId)return;
      const end=getPoint(view,event),begin=start;start=null;clearGhost();
      try{view.surface.releasePointerCapture(event.pointerId);}catch{}
      if(Math.abs(end.x-begin.x)<14||Math.abs(end.y-begin.y)<8)return;
      suppressedClick=true;
      setTimeout(()=>{suppressedClick=false;},0);
      try{
        const box=clampBox({x0:begin.x,y0:begin.y,x1:end.x,y1:end.y},view.width,view.height);
        select(view,{box,sourceKind:'manual',...getOriginalForBox(view,box)});
      }catch(error){status('Alan seçilemedi: '+error.message,true);}
    });
    view.surface.addEventListener('pointercancel',()=>{start=null;clearGhost();});
  }
  function paint(view){
    view.editLayer?.remove();view.editLayer=null;
    if(!view.edits?.length||!view.surface)return;
    const layer=document.createElement('div');layer.className='visual-edit-layer';
    layer.style.width=view.width+'px';layer.style.height=view.height+'px';
    for(const edit of view.edits){
      const box=edit.box,w=box.x1-box.x0,h=box.y1-box.y0;
      const el=document.createElement('div');el.className='visual-edit-box';
      el.dataset.visibleEditId=edit.id;
      el.style.left=box.x0+'px';el.style.top=box.y0+'px';
      el.style.width=w+'px';el.style.height=h+'px';
      if(edit.patchPng?.startsWith('data:image/png;base64,')){
        const img=document.createElement('img');
        img.src=edit.patchPng;img.alt='Düzenlenmiş yazı';
        img.width=Math.ceil(w);img.height=Math.ceil(h);
        img.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
        el.append(img);
      }else{
        // Legacy v0.6.1 edit fallback; new edits use a scan-matched PNG patch.
        el.style.backgroundColor=edit.fill;el.style.color=edit.ink;
        el.style.fontWeight=edit.bold?'700':'400';
        try{
          const plan=fitVisibleText(edit.text,w,h,edit.fontSize,measureAtOne);
          el.style.padding=plan.padding+'px';
          el.style.fontSize=plan.fontSize+'px';el.style.lineHeight=plan.lineHeight+'px';
          el.textContent=edit.text;
        }catch(error){console.warn('Eski görsel yazı yerleşimi:',error);el.textContent=edit.text;}
      }
      layer.append(el);
    }
    view.surface.append(layer);view.editLayer=layer;
  }
  function mutate(view,edits){
    undoStack.push({index:view.index,old:view.edits.map(e=>({...e,box:{...e.box}}))});
    if(undoStack.length>40)undoStack.shift();
    view.edits=edits;
    syncPage(view);
  }
  async function applyEdit(deleting=false){
    if(!selection)return;
    const chosen=selection,view=chosen.view;
    save.disabled=true;
    if($('editDelete'))$('editDelete').disabled=true;
    reportEdit('Yazı görüntüye uygulanıyor...');
    try{
      if(!view.canvas)throw new Error('Sayfa görüntüsü hazır değil. Belgeyi tekrar açıp OCR işlemini tamamla.');
      await ensureFonts();
      if(selection!==chosen)return;
      const existing=chosen.id?view.edits.find(e=>e.id===chosen.id):null;
      const item=normalizeVisibleEdit({...chosen,id:existing?.id||crypto.randomUUID(),
        operation:deleting?'delete':'replace',text:deleting?'':text.value},view.width,view.height);
      if(!deleting&&item.original.trim()===item.text.trim())
        throw new Error('Yeni yazı orijinaliyle aynı. Değişiklik yapılmadı.');
      // A single maximum OCR padding can include a letter from another line.
      // Try progressively smaller pixel-safe crops without ever compromising
      // the original glyph-height or touching other recognized words.
      const candidates=prepareEditCandidates({box:item.box,
        pageWidth:view.width,pageHeight:view.height,words:view.words,
        sourceIndices:item.sourceIndices,sourceIndex:item.sourceIndex,
        sourceKind:existing?'manual':item.sourceKind});
      const items=existing?view.edits.map(e=>e.id===item.id?item:e):[...view.edits,item];
      let rendered=null,typography=null,lastFailure=null;
      for(const geometry of candidates){
        item.box=geometry.box;
        const duplicate=items.some(e=>e.id!==item.id&&e.box.x0<item.box.x1&&e.box.x1>item.box.x0&&
          e.box.y0<item.box.y1&&e.box.y1>item.box.y0);
        if(duplicate){lastFailure=new Error('Bu yazı alanında başka bir düzenleme var. Önce onu kaldır.');continue;}
        const intruders=findUnselectedOverlap(view.words,item.box,item.sourceIndices,item.sourceIndex);
        if(intruders.length){
          lastFailure=new Error('Seçilen alan "'+intruders[0].word+'" yazısını kesiyor. Daha dar bir alan seç.');
          continue;
        }
        try{
          // Detect typography from the ORIGINAL glyph box, not from the
          // enlarged safety crop (whose whitespace would distort the match).
          typography=deleting?null:analyzeScanTypography(view.canvas,view.words,chosen.box,
            chosen.original||item.original,{ink:item.ink,fill:item.fill,bold:item.bold});
          if(typography)typography.targetHeight=geometry.targetHeight;
          rendered=renderScanReplacement(view.canvas,item,typography);
          break;
        }catch(error){
          lastFailure=error;
          // Never force unsafe restoration. Only accept an alternative if ALL
          // its own segmentation, clipping and overlap checks pass.
        }
      }
      if(!rendered)throw lastFailure||new Error('Kelimeyi güvenli biçimde değiştirecek bir alan bulunamadı.');
      item.patchPng=rendered.png;
      item.transparency='bounded-restoration';
      item.repairedPixels=rendered.repairedPixels;
      item.typography=typography;
      item.fontSize=rendered.layout.fontSize;
      mutate(view,items);
      // Showing-original is a deliberate comparison mode. After a successful
      // edit, show the corrected image or it looks like Uygula did nothing.
      if(showingOriginal){
        showingOriginal=false;$('pages').classList.remove('show-original');
        compare.setAttribute('aria-pressed','false');
      }
      panel.hidden=true;selection=null;
      reportEdit('');
      status('Sayfa '+view.index+': temiz kağıt üzerinde iz bırakmayan düzeltme uygulandı ('+
        rendered.repairedPixels+' eski yazı pikseli düzeltildi). Orijinal dosya korundu.');
    }catch(error){
      const reason=error?.message||'Bilinmeyen düzenleme hatası';
      reportEdit('Uygulanamadı: '+reason,true);
      status('Görsel yazı uygulanamadı: '+reason,true);
    }
    finally{save.disabled=false;if($('editDelete'))$('editDelete').disabled=false;}
  }
  save.addEventListener('click',()=>applyEdit(false));
  $('editDelete')?.addEventListener('click',()=>applyEdit(true));
  remove.addEventListener('click',()=>{
    if(!selection?.id)return;
    const view=selection.view;
    mutate(view,view.edits.filter(e=>e.id!==selection.id));
    panel.hidden=true;selection=null;status('Görsel yazı değişikliği kaldırıldı.');
  });
  cancel.addEventListener('click',()=>{selection=null;panel.hidden=true;});
  undo.addEventListener('click',()=>{
    const previous=undoStack.pop();if(!previous)return;
    const view=state.sheets[previous.index-1];if(!view)return;
    view.edits=previous.old;syncPage(view);
    selection=null;panel.hidden=true;status('Son düzenleme geri alındı.');
  });
  async function saveEdited(){
    if(!hasEdits()||state.busy)return;
    exportButton.disabled=true;
    try{
      const result=await createEditedPdf(state.sourceBytes,state.sheets,msg=>status(msg));
      const name=saveBytesAsPdf(result.bytes,state.sourceName,'duzenlenmis');
      status(name+' kaydedildi. '+result.count+' görsel yazı değişikliği işlendi. Orijinal dosya korundu.');
    }catch(error){status('Düzenlenmiş PDF oluşturulamadı: '+error.message,true);}
    finally{syncControls();}
  }
  exportButton.addEventListener('click',saveEdited);
  reset();
  return {attach,paint,reset,pageText,syncPage,toggle,hasEdits,saveEdited,
    hasPageEdits:view=>Boolean(view.edits?.length),syncControls};
}
