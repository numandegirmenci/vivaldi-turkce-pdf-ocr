/**
 * v0.5.5: Actual text selection, not just scrolling and a yellow preview.
 * PDF selection -> select matching characters in RIGHT textarea (Ctrl+C works).
 * If OCR changed the spelling so no matching characters exist, show/select the
 * exact user selection in a dedicated editable right-hand field instead.
 * Right textarea -> navigate to corresponding PDF page.
 * No clipboard write or PDF-text replacement happens without user action.
 */
export function installSelectionSync({pages,text,status=()=>{}}) {

  if (!document.getElementById('v055-selection-styles')) {
    const style=document.createElement('style');
    style.id='v055-selection-styles';
    style.textContent=`
      .selection-sync {max-height:265px!important}
      .selection-sync-fallback-label{font-weight:600;font-size:11px;color:#23495e}
      .selection-sync-exact{flex:none;min-height:52px;height:auto;max-height:110px;resize:vertical;padding:7px;
        font:13px/1.45 'Segoe UI',sans-serif;border:2px solid #24a5d1;background:#fff}
      .selection-sync-exact[hidden],.selection-sync-fallback-label[hidden]{display:none!important}
      ::highlight(vivaldi-pdf-sync-selection){background-color:rgba(42,139,251,.38)}
    `;
    (document.head||document.documentElement).append(style);
  }
  // Sürüm göstergesini HTML'yi değiştirmeden güncelle.
  const brand=document.querySelector('.brand');
  if(brand){for(const e of brand.querySelectorAll('small')){
    if(e.textContent?.includes('Yerel v0.5.4'))e.textContent='Yerel v0.5.5 · Gerçek seçim + tablo ayrıştırma';
  }}

  const box=document.createElement('section');box.className='selection-sync';
  box.setAttribute('aria-label','Belge ve metin seçimi eşitleme');
  const head=document.createElement('div');head.className='selection-sync-heading';
  const label=document.createElement('strong');label.textContent='Sol ↔ sağ metin seçimi';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Seçileni kopyala';copy.disabled=true;
  head.append(label,copy);
  const preview=document.createElement('div');preview.className='selection-sync-preview';
  preview.textContent='Soldaki sayfadan metin seç: sağda da seçili hale gelsin.';
  preview.setAttribute('aria-live','polite');preview.tabIndex=0;
  const exactLabel=document.createElement('label');exactLabel.className='selection-sync-fallback-label';
  exactLabel.textContent='OCR metni farklı okudu · Soldan birebir alınan metin:';exactLabel.hidden=true;
  const exact=document.createElement('textarea');exact.className='selection-sync-exact';
  exact.rows=2;exact.spellcheck=false;exact.hidden=true;exact.setAttribute('aria-label','Solda seçilen metnin birebir kopyası');
  const meta=document.createElement('small');meta.className='selection-sync-meta';
  box.append(head,preview,exactLabel,exact,meta);text.before(box);
  let last='',pageNumber=0,queued=false,shouldFocus=false,highlighted=null;
  const highlighter=globalThis.CSS?.highlights;
  const highlightKey='vivaldi-pdf-sync-selection';

  function elementOf(node){return node?.nodeType===1?node:node?.parentElement;}
  function sheetOf(node){const e=elementOf(node);return e&&pages.contains(e)?e.closest?.('.sheet'):null;}
  function sheetPage(sheet){return Number(sheet?.querySelector?.('.sheet-title span')?.textContent?.match(/\d+/)?.[0]||0);}
  function leftSelection(){
    const selection=window.getSelection?.();
    if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
    const a=sheetOf(selection.anchorNode),b=sheetOf(selection.focusNode);
    if(!a||!b)return null;
    const value=String(selection.toString()).replace(/\u00a0/g,' ').trim();
    return value?{value,page:sheetPage(a),range:selection.getRangeAt?.(0)?.cloneRange?.()}:null;
  }
  function folded(ch){
    return String(ch).toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/İ/g,'i')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/g,'ae');
  }
  // Compact text with offset mapping; handles OCR accent and whitespace differences.
  function compactWithMap(source){
    let compact='',lastSpace=false;const startMap=[],endMap=[];
    for(let i=0;i<source.length;i++){
      const f=folded(source[i]);
      for(const char of f){
        const ch=/\s/.test(char)?' ':char;
        if(ch===' '&&lastSpace){endMap[endMap.length-1]=i+1;continue;}
        compact+=ch;startMap.push(i);endMap.push(i+1);lastSpace=ch===' ';
      }
    }
    return {compact,startMap,endMap};
  }
  function editDistanceWithin(a,b,limit){
    if(Math.abs(a.length-b.length)>limit)return limit+1;
    const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let previous=row[0];row[0]=i;let min=row[0];
      for(let j=1;j<=b.length;j++){
        const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
        previous=old;min=Math.min(min,row[j]);
      }
      if(min>limit)return limit+1;
    }
    return row[b.length];
  }
  function findRight(value,page){
    const all=text.value||'';if(!all.length)return null;
    const header=page?`--- Sayfa ${page} ---`:'';
    const from=header?all.indexOf(header):-1;
    const begin=from>=0?from+header.length:0;
    const next=page?all.indexOf(`--- Sayfa ${page+1} ---`,begin):-1;
    const end=next>=0?next:all.length,excerpt=all.slice(begin,end);
    let at=excerpt.indexOf(value),len=value.length;
    if(at<0){
      const needle=compactWithMap(value.trim()).compact;
      const map=compactWithMap(excerpt),i=map.compact.indexOf(needle);
      if(i>=0){at=map.startMap[i];len=map.endMap[i+needle.length-1]-at;}
      // OCR often changes 1–2 letters within a single word. Only perform
      // conservative fuzzy matching for longer one-word selections.
      else if(needle.length>=7&&needle.length<=48&&!needle.includes(' ')){
        const limit=Math.max(1,Math.min(3,Math.floor(needle.length*.22)));
        const candidates=[...map.compact.matchAll(/[^\s\t,.:;()[\]{}]+/g)];
        let best=null;
        for(const m of candidates){
          const candidate=m[0];if(Math.abs(candidate.length-needle.length)>limit)continue;
          const distance=editDistanceWithin(needle,candidate,limit);
          if(distance<=limit&&(!best||distance<best.distance))best={distance,index:m.index,length:candidate.length};
        }
        if(best){at=map.startMap[best.index];len=map.endMap[best.index+best.length-1]-at;}
      }
    }
    return at<0?null:{start:begin+at,end:begin+at+len};
  }
  function previewSelection(value,page,source,matched){
    last=value;pageNumber=page;
    preview.replaceChildren();const mark=document.createElement('mark');mark.textContent=value;preview.append(mark);
    copy.disabled=false;
    meta.textContent=(page?`Sayfa ${page} · `:'')+value.length+' karakter · '+
      (source==='left'?(matched?'Sağdaki OCR metninde seçildi':'OCR farklı okunmuş olabilir · Birebir seçim aşağıda'):'Sol sayfaya hizalandı');
  }
  function focusAndSelect(field,start,end){
    try{field.focus?.({preventScroll:true});}catch{field.focus?.();}
    field.setSelectionRange?.(start,end,'forward');
  }
  function revealRight(start){
    const style=typeof getComputedStyle==='function'?getComputedStyle(text):null;
    if(style&&text.parentNode&&text.clientWidth>0&&text.clientHeight>0){
      let mirror;
      try{
        mirror=document.createElement('div');const marker=document.createElement('span');marker.textContent='\u200b';
        mirror.style.position='absolute';mirror.style.visibility='hidden';mirror.style.pointerEvents='none';
        mirror.style.whiteSpace='pre-wrap';mirror.style.overflowWrap='break-word';mirror.style.boxSizing='border-box';
        mirror.style.width=text.clientWidth+'px';mirror.style.font=style.font;
        mirror.style.lineHeight=style.lineHeight;mirror.style.padding=style.padding;mirror.style.border=style.border;
        mirror.append(document.createTextNode((text.value||'').slice(0,start)),marker);
        text.parentNode.append(mirror);
        text.scrollTop=Math.max(0,marker.offsetTop-text.clientHeight/3);
        mirror.remove();return;
      }catch{mirror?.remove?.();}
    }
    const before=String(text.value||'').slice(0,start);
    text.scrollTop=Math.max(0,(before.split('\n').length-3)*19);
  }
  function showLeftHighlight(range){
    try{
      if(highlighter&&typeof Highlight!=='undefined'&&range){
        highlighter.set(highlightKey,new Highlight(range));
      }
    }catch{/* PDF DOM selection still works without CSS Highlight support */}
  }
  function update(){
    queued=false;const focus=shouldFocus;shouldFocus=false;
    const selection=leftSelection();if(!selection)return;
    const match=findRight(selection.value,selection.page);
    previewSelection(selection.value,selection.page,'left',!!match);
    showLeftHighlight(selection.range);
    exact.hidden=!!match;exactLabel.hidden=!!match;
    if(match){
      revealRight(match.start);
      text.setSelectionRange?.(match.start,match.end,'forward');
      if(focus)focusAndSelect(text,match.start,match.end);
    } else {
      exact.value=selection.value;
      exact.setSelectionRange?.(0,exact.value.length,'forward');
      if(focus)focusAndSelect(exact,0,exact.value.length);
    }
  }
  function schedule(focus=false){
    shouldFocus=shouldFocus||focus;
    if(queued)return;queued=true;
    (globalThis.requestAnimationFrame||((f)=>setTimeout(f,0)))(update);
  }
  function pageForOffset(index){
    const value=String(text.value||'').slice(0,index);
    let page=0;for(const found of value.matchAll(/--- Sayfa (\d+) ---/g))page=Number(found[1]);
    return page;
  }
  function updateRight(){
    const from=Number(text.selectionStart||0),to=Number(text.selectionEnd||from);
    const page=pageForOffset(from),chosen=String(text.value||'').slice(from,to).trim();
    const sheet=Array.from(pages.querySelectorAll?.('.sheet')||[]).find(s=>sheetPage(s)===page);
    if(!sheet)return;
    sheet.scrollIntoView?.({block:'center',behavior:'smooth'});
    if(highlighted){highlighted.classList?.remove?.('sync-target-page');highlighted=null;}
    sheet.classList?.add?.('sync-target-page');highlighted=sheet;
    if(chosen)previewSelection(chosen,page,'right',true);
    else meta.textContent=`Sayfa ${page} · Sol belge bu sayfaya hizalandı.`;
  }
  document.addEventListener('selectionchange',()=>schedule(false));
  // Focus right only AFTER the pointer/keyboard selection on the left is complete.
  pages.addEventListener('mouseup',()=>schedule(true));
  pages.addEventListener('touchend',()=>schedule(true));
  pages.addEventListener('keyup',e=>{if(e.shiftKey||e.key==='Enter')schedule(true);});
  pages.addEventListener('copy',()=>{update();if(last)meta.textContent='Panoya alındı · '+(pageNumber?'Sayfa '+pageNumber:'seçim');},true);
  text.addEventListener?.('mouseup',updateRight);
  text.addEventListener?.('keyup',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='Home'||e.key==='End'||e.shiftKey)updateRight();});
  text.addEventListener?.('click',updateRight);
  copy.addEventListener('click',async()=>{
    if(!last)return;
    try{await navigator.clipboard.writeText(last);meta.textContent='Seçilen metin kopyalandı.';status('Seçilen metin kopyalandı.');}
    catch{meta.textContent='Panoya erişim engellendi: seçili metinden Ctrl+C kullan.';}
  });
  return {getSelected(){return last;},clear(){
    last='';pageNumber=0;copy.disabled=true;preview.textContent='Soldaki sayfadan metin seç: sağda da seçili hale gelsin.';
    meta.textContent='';exact.hidden=true;exactLabel.hidden=true;exact.value='';
    try{highlighter?.delete(highlightKey);}catch{}
    if(highlighted)highlighted.classList?.remove?.('sync-target-page');highlighted=null;
  },refresh:()=>schedule(false)};
}
