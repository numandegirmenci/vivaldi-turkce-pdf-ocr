import {clampBox,normalizeVisibleEdit,fitVisibleText,textWithVisibleEdits} from './visual-edits.mjs';
import {formatOcrWords} from './text-utils.mjs';
import {createEditedPdf,saveBytesAsPdf} from './export-pdf.mjs';

/** User-triggered, reversible visual edits. No network calls or automatic document rewriting. */
export function installVisualEditor({$,state,status,updateExtractedText,refreshText}) {
  let enabled=false, selection=null, undoStack=[];
  const mode=$('editVisible'),panel=$('visualEditor'),label=$('editLocation');
  const text=$('editText'),size=$('editSize'),ink=$('editInk'),fill=$('editFill');
  const save=$('editApply'),remove=$('editRemove'),cancel=$('editCancel');
  const exportButton=$('exportEdited'),undo=$('editUndo');
  const measure=document.createElement('canvas').getContext('2d');
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
    if(!enabled){selection=null;panel.hidden=true;}
    status(enabled?'Düzenleme açık: bir kelimeye tıkla veya metin alanını fareyle işaretle.':'Yazı düzenleme kapatıldı.');
  };
  mode.addEventListener('click',()=>toggle(!enabled));
  function syncControls(){
    const count=state.sheets.reduce((n,v)=>n+(v.edits?.length||0),0);
    $('editCount').textContent=count?count+' görsel değişiklik':'Henüz değişiklik yok';
    exportButton.disabled=!state.pdf||count===0||state.busy;
    undo.disabled=!undoStack.length;
  }
  function reset(){
    enabled=false;selection=null;undoStack=[];
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
    state.pages[view.index-1]=pageText(view);
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
  function sampleFill(view,box) {
    if(!view.canvas)return '#ffffff';
    try{
      const ctx=view.canvas.getContext('2d',{willReadFrequently:true});
      const points=[
        [box.x0-3,box.y0-3],[box.x1+3,box.y0-3],
        [box.x0-3,box.y1+3],[box.x1+3,box.y1+3],
        [(box.x0+box.x1)/2,box.y0-3],[(box.x0+box.x1)/2,box.y1+3]
      ];
      const samples=points.map(([x,y])=>{
        const p=ctx.getImageData(Math.max(0,Math.min(view.canvas.width-1,Math.round(x))),Math.max(0,Math.min(view.canvas.height-1,Math.round(y))),1,1).data;
        return [p[0],p[1],p[2]];
      });
      const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
      const rgb=[0,1,2].map(c=>median(samples.map(s=>s[c])));
      return '#'+rgb.map(c=>Math.round(c).toString(16).padStart(2,'0')).join('');
    }catch{return '#ffffff';}
  }
  function select(view,choice){
    if(!enabled)return;
    if(view.rotation||view.page.rotate){
      status('Döndürülmüş sayfalarda görsel yazı düzenleme henüz desteklenmiyor.',true);return;
    }
    try{
      const box=clampBox(choice.box,view.width,view.height);
      selection={view,...choice,box};
      const existing=choice.id?view.edits.find(e=>e.id===choice.id):null;
      text.value=existing?.text??choice.original??'';
      size.value=String(Math.round(existing?.fontSize||Math.max(8,Math.min(48,(box.y1-box.y0)*.73))));
      ink.value=existing?.ink||'#172b3d';
      fill.value=existing?.fill||sampleFill(view,box);
      label.textContent='Sayfa '+view.index+' · '+(existing?'Değişikliği düzenle':choice.sourceKind==='manual'?'Seçilen alan':'Tanınan yazı');
      remove.hidden=!existing;panel.hidden=false;
      text.focus({preventScroll:true});text.select();
    }catch(error){status('Alan seçilemedi: '+error.message,true);}
  }
  function getOriginalForBox(view,box){
    const hits=[];
    for(let i=0;i<(view.words||[]).length;i++){
      const w=view.words[i];
      if(!w.bbox)continue;
      const centerX=(w.bbox.x0+w.bbox.x1)/2,centerY=(w.bbox.y0+w.bbox.y1)/2;
      if(centerX>=box.x0&&centerX<=box.x1&&centerY>=box.y0&&centerY<=box.y1)hits.push(i);
    }
    const words=hits.map(i=>view.words[i].text);
    return {sourceIndices:hits,original:words.join(' ')};
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
      if(event.target.closest?.('.ocr-layer span, .textLayer span, [data-visible-edit-id]'))return;
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
      el.style.backgroundColor=edit.fill;el.style.color=edit.ink;
      try{
        const plan=fitVisibleText(edit.text,w,h,edit.fontSize,measureAtOne);
        el.style.padding=plan.padding+'px';
        el.style.fontSize=plan.fontSize+'px';el.style.lineHeight=plan.lineHeight+'px';
        el.textContent=edit.text;
      }catch(error){console.warn('Görsel yazı yerleşimi:',error);el.textContent=edit.text;}
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
  save.addEventListener('click',()=>{
    if(!selection)return;
    const view=selection.view;
    try{
      const existing=selection.id?view.edits.find(e=>e.id===selection.id):null;
      const item=normalizeVisibleEdit({...selection,id:existing?.id||crypto.randomUUID(),
        text:text.value,fontSize:Number(size.value),ink:ink.value,fill:fill.value},view.width,view.height);
      // Avoid placing a new rectangle over the same text without an explicit edit.
      const items=existing?view.edits.map(e=>e.id===item.id?item:e):[...view.edits,item];
      const duplicate=items.some(e=>e.id!==item.id&&e.box.x0<item.box.x1&&e.box.x1>item.box.x0&&
        e.box.y0<item.box.y1&&e.box.y1>item.box.y0);
      if(duplicate)throw new Error('Bu yazı alanında başka bir düzenleme var. Önce onu düzenle veya kaldır.');
      fitVisibleText(item.text,item.box.x1-item.box.x0,item.box.y1-item.box.y0,item.fontSize,measureAtOne);
      mutate(view,items);
      panel.hidden=true;selection=null;
      status('Sayfa '+view.index+' üzerinde yazı değiştirildi. Orijinal belge henüz değiştirilmedi.');
    }catch(error){status('Yazı uygulanamadı: '+error.message,true);}
  });
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
