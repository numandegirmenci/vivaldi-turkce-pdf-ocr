import {findTextMatches} from './text-utils.mjs';

/** Görünür sayfada PDF/Tesseract sözcüklerini sarı vurgula. */
export function drawPageHighlights(view, query) {
  view.searchLayer?.remove();
  view.searchLayer=null;
  const text=String(query || '').trim();
  if (!text || !view.surface) return;
  const tokens=text.toLocaleLowerCase('tr-TR').split(/\s+/).filter(token=>token.length>=2);
  if (!tokens.length) return;
  const layer=document.createElement('div');
  layer.className='search-layer';
  layer.style.width=view.width+'px';
  layer.style.height=view.height+'px';
  let words=[];
  if(view.textSource==='ocr' && view.words?.length) {
    words=view.words.map(w=>({text:w.text,box:w.bbox}));
  } else if(view.nativeContent?.items) {
    words=view.nativeContent.items.map(item=>{
      const pos=view.viewport.convertToViewportPoint(item.transform?.[4]||0,item.transform?.[5]||0);
      const height=Math.max(3,(Number(item.height)||10)*view.viewport.scale);
      return {text:item.str,box:{x0:pos[0],y0:pos[1]-height,x1:pos[0]+Math.max(2,(Number(item.width)||10)*view.viewport.scale),y1:pos[1]}};
    });
  }
  for(const w of words) {
    if(layer.childElementCount>=250)break;
    if(!tokens.some(token=>String(w.text||'').toLocaleLowerCase('tr-TR').includes(token)))continue;
    const {x0,x1,y0,y1}=w.box;
    if(![x0,x1,y0,y1].every(Number.isFinite) || x1<=x0 || y1<=y0)continue;
    const mark=document.createElement('span');
    mark.style.left=x0+'px';
    mark.style.top=y0+'px';
    mark.style.width=(x1-x0)+'px';
    mark.style.height=(y1-y0)+'px';
    layer.append(mark);
  }
  if(layer.childElementCount) {
    view.surface.append(layer);
    view.searchLayer=layer;
  }
}

export function installViewerTools({$,state,status,goToPage,scanAll,saveSearchablePdf,setZoom,applyZoom}) {
  let matches=[],cursor=-1;
  const input=$('searchInput');
  function refresh() {
    matches=findTextMatches(state.pages,input.value);
    if(cursor>=matches.length)cursor=matches.length-1;
    $('searchInfo').textContent = input.value.trim()
      ? matches.length+' sonuç'+(state.allTextReady?'':' (henüz işlenen sayfalarda)')
      : 'Ctrl+F: Ara';
    for(const view of state.sheets) {
      const has=matches.some(hit=>hit.page===view.index);
      view.sheet.classList.toggle('search-page',has);
      drawPageHighlights(view,input.value);
    }
  }
  function move(delta) {
    if(!matches.length)return;
    cursor=(cursor+delta+matches.length)%matches.length;
    const hit=matches[cursor];
    goToPage(hit.page);
    $('searchInfo').textContent=(cursor+1)+' / '+matches.length+' • Sayfa '+hit.page;
  }
  input.addEventListener('input',()=>{cursor=-1;refresh();});
  $('searchNext').onclick=()=>move(1);
  $('searchPrevious').onclick=()=>move(-1);
  $('searchAll').onclick=async()=>{
    await scanAll(false);
    refresh();
    status('Belgenin tüm sayfalarında arama hazır.');
  };
  $('goPage').onclick=()=>{
    const n=Number($('pageNumber').value);
    if(Number.isInteger(n))goToPage(n);
  };
  $('pageNumber').addEventListener('keydown',event=>{
    if(event.key==='Enter'){$('goPage').click();event.preventDefault();}
  });
  $('copyTable').onclick=async()=>{
    try {
      await scanAll(false);
      await navigator.clipboard.writeText(state.pages.join('\n\n'));
      status('Metin satır ve sütun aralıkları korunarak kopyalandı.');
    }catch(error){status('Kopyalama hatası: '+error.message,true);}
  };
  $('exportPdf').onclick=()=>saveSearchablePdf();
  document.addEventListener('keydown',event=>{
    const editable=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
    if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='f'){
      event.preventDefault();input.focus();input.select();return;
    }
    if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='s'){
      event.preventDefault();saveSearchablePdf();return;
    }
    if(event.key==='F3' || ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='g')){
      event.preventDefault();move(event.shiftKey?-1:1);return;
    }
    if(event.key==='Escape' && document.activeElement===input){input.blur();return;}
    if(editable || event.ctrlKey || event.metaKey || event.altKey)return;
    switch(event.key.toLowerCase()){
      case 'j':goToPage(Math.min(state.sheets.length,(state.activePage||1)+1));break;
      case 'k':goToPage(Math.max(1,(state.activePage||1)-1));break;
      case '+':case '=':setZoom(state.zoom*1.25);break;
      case '-':setZoom(state.zoom/1.25);break;
      case '0':state.viewMode='width';state.zoom=1;applyZoom();break;
      case '1':state.viewMode='page';state.zoom=1;applyZoom();break;
    }
  });
  return {refresh,paint:view=>drawPageHighlights(view,input.value)};
}
