import * as pdfjs from './vendor/pdf.mjs';
import { hasUsablePdfText, formatPdfText, collectOcrWords, getSafeRenderScale, formatOcrWords } from './text-utils.mjs';
import { installViewerTools } from './viewer-tools.mjs';
import { createSearchablePdf, saveBytesAsPdf } from './export-pdf.mjs';

import {normalizeToPdf} from './document-input.mjs';
import {prepareOcrSurface,remapOcrWords} from './ocr-quality.mjs';
import {chooseBestOcrResult,ocrPassPlan} from './ocr-ranker.mjs';
import {installSelectionSync} from './selection-sync.mjs';
import {installVisualEditor} from './visual-editor.mjs';
import {installSmartInspector} from './smart-inspector.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdf.worker.mjs');
const $ = id => document.getElementById(id);
const status = (message, bad=false) => {
  $('status').textContent = message;
  $('status').classList.toggle('error', bad);
};
const state = {
  pdf: null, pages: [], sheets: [], run: 0,
  viewMode: 'width', zoom: 1, busy: false,
  workerPromise: null, ocrQueue: Promise.resolve(),
  sourceBytes:null, sourceName:'belge.pdf',
  observer:null, renderQueue:Promise.resolve(), scanPromise:null,
  allTextReady:false, activePage:1, maxCanvases:8,
};

$('choose').onclick = () => $('file').click();
$('file').onchange = async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if(visualEditor.hasEdits() && !window.confirm('Kaydedilmemiş görsel yazı değişiklikleri var. Yeni dosya açılırsa bu değişiklikler kaybolacak. Devam edilsin mi?'))return;
  $('original').hidden = true; $('original').removeAttribute('href');
  // PDF bağlantısındaki geç yüklenen bir istek, seçilen dosyanın üzerine yazmasın.
  const request = ++state.run;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (request === state.run) await openBytes(bytes, file.name, file.type);
  } catch (err) { if (request === state.run) status('Dosya okunamadı: ' + err.message, true); }
};
$('copyAll').onclick = async () => { await scanAll(false); await copyText(); };
$('copyOne').onclick = copyText;
$('original').onclick = async event => {
  event.preventDefault();
  if (!$('original').href) return;
  try {
    const result = await chrome.runtime.sendMessage({ action: 'openOriginal', url: $('original').href });
    if (!result?.ok) status('Orijinal PDF açılamadı: ' + (result?.error || 'Bilinmeyen hata'), true);
  } catch (error) { status('Orijinal PDF açılamadı: ' + error.message, true); }
};
$('reocr').onclick = () => {
  if(visualEditor.hasEdits()){status('Önce düzenlenmiş PDF\'yi kaydet ve düzenlemeleri geri al; yeniden OCR mevcut alanları değiştirebilir.',true);return;}
  if(state.pdf)scanAll(true);
};
$('native').onclick = () => {
  if(visualEditor.hasEdits()){status('Görsel düzenlemeler varken PDF metnine dönüş kapalı. Değişiklikleri ayrı PDF olarak kaydet.',true);return;}
  if(state.pdf)renderDocument(false);
};
$('zoomOut').onclick = () => setZoom(state.zoom / 1.25);
$('zoomIn').onclick = () => setZoom(state.zoom * 1.25);
$('fit').onclick = () => { state.viewMode='page'; state.zoom=1; applyZoom(); };
$('fitWidth').onclick = () => { state.viewMode='width'; state.zoom=1; applyZoom(); };
new ResizeObserver(applyZoom).observe($('pages'));
$('scanAll').onclick = () => scanAll(false);
const viewerTools = installViewerTools({
  $,state,status,goToPage,scanAll,saveSearchablePdf,setZoom,applyZoom,
});


const selectionSync=installSelectionSync({pages:$('pages'),text:$('text'),status});
const visualEditor=installVisualEditor({$,state,status,updateExtractedText,refreshText:()=>viewerTools.refresh()});
const smartInspector=installSmartInspector({
  $,state,status,ensurePage:async view=>renderPage(view,state.run),
  runOcrJobs:recognizeRegionSerially,disableVisualEditor:()=>visualEditor.toggle(false),
  updateExtractedText,getCurrentPageText:view=>visualEditor.pageText(view)
});

async function copyText() {
  try {
    await navigator.clipboard.writeText($('text').value);
    status('Metin panoya kopyalandı.');
  } catch {
    status('Kopyalama engellendi. Sağ paneldeki yazıyı seçip Ctrl+C yapabilirsin.', true);
  }
}
function setZoom(value) {
  state.zoom = Math.max(0.4, Math.min(3.125, value));
  applyZoom();
}

/** Tam sayfa, görüntüleme panelinin hem genişliğine hem yüksekliğine sığar. */
function applyZoom() {
  const pane = $('pages');
  const availableWidth = Math.max(100, pane.clientWidth - 36);
  // Başlık, alt durum satırı, panel iç boşlukları ve sayfa arası pay.
  const availableHeight = Math.max(130, pane.clientHeight - 110);
  for (const { sheet, frame, surface, width, height } of state.sheets) {
    const fitWidth = availableWidth / width;
    const fitPage = Math.min(fitWidth, availableHeight / height);
    const ratio = (state.viewMode === 'width' ? fitWidth : fitPage) * state.zoom;
    const showWidth = Math.max(1, width * ratio);
    sheet.style.width = `${showWidth}px`;
    frame.style.height = `${height * ratio}px`;
    surface.style.transform = `scale(${ratio})`;
  }
  $('zoomLabel').textContent = state.zoom === 1
    ? (state.viewMode === 'page' ? 'Tam sayfa' : 'Genişliğe sığdır')
    : `%${Math.round(state.zoom * 100)} (${state.viewMode === 'page' ? 'sayfa' : 'genişlik'})`;
  $('fit').setAttribute('aria-pressed', String(state.viewMode === 'page'));
  $('fitWidth').setAttribute('aria-pressed', String(state.viewMode === 'width'));
}

async function prepareWorker() {
  // Art arda tıklama birden fazla Tesseract worker başlatmasın.
  if (!state.workerPromise) {
    status('Türkçe OCR motoru hazırlanıyor...');
    state.workerPromise = window.Tesseract.createWorker('tur', 1, {
      workerBlobURL: false,
      workerPath: chrome.runtime.getURL('vendor/worker.min.js'),
      corePath: chrome.runtime.getURL('vendor/core'),
      langPath: chrome.runtime.getURL('vendor/lang'),
      gzip: true,
      logger: evt => {
        if (evt.status === 'recognizing text' && Number.isFinite(evt.progress)) {
          status(`OCR ilerliyor: %${Math.round(evt.progress * 100)}`);
        }
      },
    }).then(async worker => {
      await worker.setParameters({ preserve_interword_spaces: '1',user_defined_dpi:'300' });
      return worker;
    }).catch(err => {
      state.workerPromise = null; // Bir sonraki denemede tekrar oluşturulabilir.
      throw err;
    });
  }
  return state.workerPromise;
}

function recognizeSerially(view, stillCurrent, enhanced=false) {
  const task=state.ocrQueue.then(async()=>{
    if(!stillCurrent())return null;
    const worker=await prepareWorker();
    if(!stillCurrent())return null;
    const candidates=[],inputs=[];
    const run=async(mode,input)=>{
      if(!stillCurrent())return;
      await worker.setParameters({tessedit_pageseg_mode:String(mode)});
      const result=await worker.recognize(input.canvas,{}, {text:true,blocks:true,tsv:true});
      if(stillCurrent())candidates.push({mode,result,input});
    };
    try {
      const normal=await prepareOcrSurface(view,false); inputs.push(normal);
      await run(3,normal);
      if(!stillCurrent())return null;
      const first=candidates[0]?.result?.data||{};
      const firstWords=collectOcrWords(first);
      const plan=ocrPassPlan(first,firstWords,enhanced);
      // PSM 3: ordinary page; PSM 6: single uniform text block;
      // PSM 11: sparse headings, captions and separate field labels.
      // Add passes automatically only for weak/uncertain readings.
      if(plan.runLayoutBlock)await run(6,normal);
      if(!stillCurrent())return null;
      if(plan.runSparseText)await run(11,normal);
      if(!stillCurrent())return null;
      if(plan.runContrast){
        const contrast=await prepareOcrSurface(view,true);inputs.push(contrast);
        await run(6,contrast);
        if(!stillCurrent())return null;
        if(enhanced)await run(3,contrast);
        if(plan.runSparseContrast)await run(11,contrast);
      }
      if(!stillCurrent())return null;
      const best=chooseBestOcrResult(candidates,collectOcrWords);
      return {data:best.result.data,scaleX:best.input.scaleX,scaleY:best.input.scaleY};
    } finally {for(const input of inputs)input.dispose();}
  });
  state.ocrQueue=task.catch(()=>{});
  return task;
}

/** Share the same Tesseract worker safely with normal page OCR.
 * Region-specific OCR never changes state.pages or view.words.
 */
function recognizeRegionSerially(job){
  const task=state.ocrQueue.then(async()=>{
    const worker=await prepareWorker();
    await worker.setParameters({tessedit_pageseg_mode:String(job.psm)});
    const result=await worker.recognize(job.canvas,{}, {text:true,blocks:true,tsv:true});
    return result.data||{};
  });
  state.ocrQueue=task.catch(()=>{});
  return task;
}

/** Seçmeli form/tablo OCR: kontrastı ölçülü artır, orijinali değiştirme. */
function improveImage(canvas) {
  const output=document.createElement('canvas');
  output.width=canvas.width;output.height=canvas.height;
  const context=output.getContext('2d',{willReadFrequently:true});
  context.drawImage(canvas,0,0);
  const img=context.getImageData(0,0,output.width,output.height);
  const data=img.data;
  for(let n=0;n<data.length;n+=4){
    const gray=.299*data[n]+.587*data[n+1]+.114*data[n+2];
    const better=Math.max(0,Math.min(255,(gray-128)*1.28+128));
    data[n]=data[n+1]=data[n+2]=better;
  }
  context.putImageData(img,0,0);
  return output;
}

function addWordsLayer(surface, data, width, height) {
  const layer = document.createElement('div');
  layer.className = 'ocr-layer';
  layer.style.width = `${width}px`;
  layer.style.height = `${height}px`;
  // ÖNEMLİ: Ölçüm için layer önce DOM'a eklenmeli. Önceki sürümde
  // getBoundingClientRect() 0 dönüyordu ve OCR seçimi kayıyordu.
  surface.append(layer);
  const words = collectOcrWords(data);
  for (const [wordIndex,word] of words.entries()) {
    const { x0, y0, x1, y1 } = word.bbox;
    const span = document.createElement('span');
    const fontHeight = Math.max(7, y1 - y0);
    span.textContent = word.text + ' ';
    span.dataset.ocrIndex=String(wordIndex);
    span.style.left = `${x0}px`;
    span.style.top = `${y0}px`;
    span.style.fontSize = `${fontHeight * 0.89}px`;
    span.style.height = `${fontHeight}px`;
    layer.append(span);
    // offsetWidth CSS transform'dan etkilenmez; getBoundingClientRect etkilenir.
    // Tam sayfaya sığdırma durumunda da seçilebilir yazı doğru yerde kalır.
    const natural = span.offsetWidth;
    if (natural > 0) {
      span.style.transform = `scaleX(${Math.max(.15, Math.min(8, (x1 - x0) / natural))})`;
    }
  }
  return { layer, count: words.length };
}

function updateExtractedText() {
  $('text').value = state.pages.map((txt, i) => `--- Sayfa ${i + 1} ---\n${txt}`).join('\n\n');
  $('copyAll').disabled = !state.pages.some(t => t.length);
}

function createPageView(page, index, count) {
  // Sayfa kabukları hemen oluşturulur. Canvas/OCR yalnız görüntülenecek sayfada hazırlanır.
  const scale=getSafeRenderScale(page.getViewport({scale:1}),1);
  const viewport=page.getViewport({scale});
  const {width,height}=viewport;
  const sheet=document.createElement('article');sheet.className='sheet';
  const title=document.createElement('div');title.className='sheet-title';
  const titleLabel=document.createElement('span');titleLabel.textContent='Sayfa '+index+' / '+count;
  const pageTools=document.createElement('div');pageTools.className='sheet-tools';
  const originalBtn=document.createElement('button');originalBtn.textContent='PDF metni';
  originalBtn.title='Bu sayfadaki hazır metni kullan';
  const ocrBtn=document.createElement('button');ocrBtn.textContent='Bu sayfaya OCR';
  ocrBtn.title='Bu sayfayı OCR ile yeniden oku';
  const rotateBtn=document.createElement('button');rotateBtn.textContent='Döndür ↻';
  rotateBtn.title='Yalnız görüntülemeyi 90 derece döndür';
  pageTools.append(originalBtn,ocrBtn,rotateBtn);
  title.append(titleLabel,pageTools);
  const frame=document.createElement('div');frame.className='page-img';
  const surface=document.createElement('div');surface.className='page-surface';
  surface.style.width=width+'px';surface.style.height=height+'px';
  frame.append(surface);
  const line=document.createElement('div');line.className='sheet-status';
  line.textContent='Sayfa hazır. Görünür olduğunda işlenecek.';
  sheet.append(title,frame,line);$('pages').append(sheet);
  const view={index,page,viewport,width,height,sheet,frame,surface,canvas:null,line,
    originalBtn,ocrBtn,rotateBtn,nativeContent:null,token:0,currentLayer:null,searchLayer:null,
    words:[],textSource:null,processed:false,processing:false,loadPromise:null,
    rotation:0,lastUsed:0};
  state.sheets.push(view);
  visualEditor.attach(view);
  smartInspector.attach(view);
  originalBtn.disabled=ocrBtn.disabled=true;
  originalBtn.onclick=async()=>{if(!state.busy&&!visualEditor.hasPageEdits(view)){await renderPage(view,state.run);await processPageText(view,false,state.run);}};
  ocrBtn.onclick=async()=>{if(!state.busy&&!visualEditor.hasPageEdits(view)){await renderPage(view,state.run);await processPageText(view,true,state.run);}};
  rotateBtn.onclick=()=>rotatePage(view);
  state.observer?.observe(sheet);
  applyZoom();
  return view;
}

function goToPage(number) {
  if(!Number.isInteger(number) || number<1 || number>state.sheets.length)return;
  state.activePage=number;
  $('pageNumber').value=String(number);
  state.sheets[number-1].sheet.scrollIntoView({block:'start',behavior:'smooth'});
  enqueuePage(state.sheets[number-1],state.run);
}

function rotatePage(view) {
  if(state.busy || view.processing)return;
  if(visualEditor.hasPageEdits(view)){status('Görsel yazı düzenlenen sayfa döndürülemez. Önce düzenlenmiş PDF\'yi kaydet.',true);return;}
  view.rotation=(view.rotation+90)%360;
  const scale=getSafeRenderScale(view.page.getViewport({scale:1,rotation:view.page.rotate+view.rotation}),1);
  view.viewport=view.page.getViewport({scale,rotation:view.page.rotate+view.rotation});
  view.width=view.viewport.width;view.height=view.viewport.height;
  releaseCanvas(view);
  view.surface.style.width=view.width+'px';
  view.surface.style.height=view.height+'px';
  view.nativeContent=null;
  view.words=[];view.processed=false;view.textSource=null;
  state.pages[view.index-1]='';
  state.allTextReady=false;
  applyZoom();updateExtractedText();viewerTools.refresh();
  enqueuePage(view,state.run);
}

function releaseCanvas(view) {
  view.smartMark?.remove();view.smartMark=null;
  view.currentLayer?.remove();view.currentLayer=null;
  view.searchLayer?.remove();view.searchLayer=null;
  view.canvas?.remove();
  if(view.canvas) {view.canvas.width=0;view.canvas.height=0;}
  view.canvas=null;
}

function boundCanvasMemory() {
  const active=state.sheets.filter(v=>v.canvas&&!v.processing&&!v.loadPromise);
  if(active.length<=state.maxCanvases)return;
  const panel=$('pages').getBoundingClientRect();
  const distant=active.filter(v=>{
    const rect=v.sheet.getBoundingClientRect();
    return rect.bottom<panel.top-600 || rect.top>panel.bottom+600;
  }).sort((a,b)=>a.lastUsed-b.lastUsed);
  for(const view of distant.slice(0,Math.max(0,active.length-state.maxCanvases)))releaseCanvas(view);
}

async function renderPage(view,run,forceOcr=false) {
  if(run!==state.run)return;
  if(view.loadPromise){
    await view.loadPromise;
    if(forceOcr && run===state.run && view.canvas)return processPageText(view,true,run);
    return;
  }
  if(view.canvas){
    view.lastUsed=Date.now();
    if(forceOcr)return processPageText(view,true,run);
    return;
  }
  view.loadPromise=(async()=>{
    try {
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
      canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';
      view.canvas=canvas;
      view.surface.prepend(canvas);
      const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
      if(!ctx)throw new Error('Canvas başlatılamadı.');
      view.line.textContent='Sayfa görüntüsü hazırlanıyor...';
      await view.page.render({canvasContext:ctx,viewport:view.viewport}).promise;
      if(run!==state.run)return;
      if(!view.nativeContent)view.nativeContent=await view.page.getTextContent();
      if(run!==state.run)return;
      if(view.processed && view.textSource==='ocr' && !forceOcr){
        view.currentLayer=addWordsLayer(view.surface,{words:view.words},canvas.width,canvas.height).layer;
        view.line.textContent='OCR metni korunuyor. Yazı seçilebilir.';
        viewerTools.paint(view);
        visualEditor.paint(view);
      } else {
        await processPageText(view,forceOcr,run);
      }
      view.lastUsed=Date.now();
    }catch(error){
      view.line.textContent='Sayfa açılamadı: '+error.message;
      view.line.classList.add('error');
      console.error('PDF sayfası:',error);
      releaseCanvas(view);
    }
  })();
  try{await view.loadPromise;}finally{
    view.loadPromise=null;
    boundCanvasMemory();
  }
}

function enqueuePage(view,run){
  if(!view || view.canvas || view.loadPromise || run!==state.run)return;
  state.renderQueue=state.renderQueue.catch(()=>{}).then(()=>renderPage(view,run));
}

async function scanAll(forceOcr=false) {
  if(!state.pdf)return;
  if(forceOcr&&visualEditor.hasEdits()){status('Görsel değişiklikler varken zorunlu OCR uygulanamaz.',true);return;}
  if(state.scanPromise)return state.scanPromise;
  const run=state.run;
  state.busy=true;
  for(const view of state.sheets)updatePageButtons(view);
  $('scanAll').disabled=true;$('exportPdf').disabled=true;
  state.scanPromise=(async()=>{
    let errors=0;
    for(let i=0;i<state.sheets.length;i++){
      if(run!==state.run)return;
      const view=state.sheets[i];
      status((forceOcr?'Zorunlu OCR':'Tüm metni hazırla')+': '+(i+1)+' / '+state.sheets.length);
      try{
        await renderPage(view,run,forceOcr);
        if(forceOcr && !view.canvas)throw new Error('Sayfa görüntüsü hazırlanamadı.');
        if(!view.processed)errors++;
      }catch(error){errors++;console.error('Sayfa işleme:',error);}
      $('counter').textContent=(i+1)+'/'+state.sheets.length+' sayfa'+(errors?' • '+errors+' hata':'');
      boundCanvasMemory();
    }
    if(run===state.run){
      state.allTextReady=errors===0;
      viewerTools.refresh();updateExtractedText();
      status(errors?'Tarama bitti; '+errors+' sayfa işlenemedi.':'Tüm sayfalarda metin hazır.' ,errors>0);
    }
  })().finally(()=>{
    if(run===state.run){
      state.busy=false;
      state.scanPromise=null;
      for(const view of state.sheets)updatePageButtons(view);
      $('scanAll').disabled=false;$('exportPdf').disabled=false;
    }
  });
  return state.scanPromise;
}

async function saveSearchablePdf(){
  if(!state.pdf || state.busy)return;
  if(visualEditor.hasEdits())return visualEditor.saveEdited();
  $('exportPdf').disabled=true;
  try{
    await scanAll(false);
    if(!state.allTextReady)throw new Error('Bazı sayfalar işlenemedi; eksik aranabilir PDF oluşturulmadı.');
    const result=await createSearchablePdf(state.sourceBytes,state.sheets,msg=>status(msg));
    const filename=saveBytesAsPdf(result.bytes,state.sourceName);
    status(filename+' kaydedildi • '+result.count+' OCR kelimesi eklendi.');
  }catch(error){status('Aranabilir PDF oluşturulamadı: '+error.message,true);}
  finally{$('exportPdf').disabled=false;}
}

function updatePageButtons(view) {
  const locked = state.busy || view.processing;
  view.originalBtn.disabled = locked || visualEditor.hasPageEdits(view) || !hasUsablePdfText(view.nativeContent);
  view.ocrBtn.disabled = locked || visualEditor.hasPageEdits(view);
  view.rotateBtn.disabled = locked || visualEditor.hasPageEdits(view);
}

async function processPageText(view, forceOcr, run) {
  const token = ++view.token;
  view.processing = true;
  updatePageButtons(view);
  const isCurrent = () => run === state.run && token === view.token;
  const native = hasUsablePdfText(view.nativeContent);
  const previousLayer = view.currentLayer;
  let newLayer = null;
  try {
    let pageText = '';
    let message = '';
    if (native && !forceOcr) {
      view.words=[];
      view.textSource='native';
      const layer = document.createElement('div'); layer.className = 'textLayer';
      layer.style.width = `${view.width}px`;
      layer.style.height = `${view.height}px`;
      layer.style.setProperty('--scale-factor', String(view.viewport.scale));
      view.surface.append(layer);
      newLayer = layer;
      try {
        await new pdfjs.TextLayer({
          textContentSource: view.nativeContent, container: layer, viewport: view.viewport,
        }).render();
        message = 'Hazır PDF/OCR metni korundu. Yazı sayfadan seçilebilir.';
      } catch (error) {
        // PDF metni sağ panelde kaybolmasın; yalnızca seçilebilir katman açılamadı.
        layer.remove(); newLayer = null;
        message = 'PDF metni sağda mevcut, sayfa üzerindeki seçim katmanı açılamadı.';
        console.error('PDF metin katmanı:', error);
      }
      pageText = formatPdfText(view.nativeContent, view.viewport);
    } else {
      view.line.textContent = forceOcr ? 'Bu sayfaya Türkçe OCR uygulanıyor...' : 'Metinsiz sayfaya OCR uygulanıyor...';
      const enhanced=$('ocrQuality').checked;
      const response = await recognizeSerially(view, isCurrent, enhanced);
      if (!isCurrent() || !response) return;
      const data = response.data || {};
      const words=remapOcrWords(collectOcrWords(data),response.scaleX||1,response.scaleY||1);
      pageText = formatOcrWords(words) || (data.text || '').trim();
      view.words=words;
      view.textSource='ocr';
      // Seçilebilir sözcük alanı yalnızca OCR tamamlanınca oluşturulur.
      const result = addWordsLayer(view.surface, {words}, view.canvas.width, view.canvas.height);
      newLayer = result.layer;
      message = result.count
        ? `OCR tamamlandı: ${result.count} seçilebilir sözcük.`
        : (pageText ? 'OCR metni sağda var ancak kelime koordinatı bulunamadı.' : 'Okunabilir metin bulunamadı.');
    }
    if (!isCurrent()) { newLayer?.remove(); return; }
    if (previousLayer && previousLayer !== newLayer) previousLayer.remove();
    view.currentLayer = newLayer;
    view.baseText=pageText;
    state.pages[view.index - 1] = visualEditor.pageText(view)+smartInspector.getNotes(view);
    view.processed=true;
    visualEditor.paint(view);
    view.lastUsed=Date.now();
    updateExtractedText();
    viewerTools.refresh();
    viewerTools.paint(view);
    view.line.textContent = message;
    view.line.classList.toggle('error', /açılamadı|bulunamadı/.test(message));
    if (!state.busy) status(`Sayfa ${view.index} güncellendi. Diğer sayfaların metni korundu.`);
    return true;
  } catch (error) {
    if (newLayer) newLayer.remove();
    if (isCurrent()) {
      if (!forceOcr && !state.pages[view.index-1] && view.nativeContent?.items?.length) {
        state.pages[view.index-1] = formatPdfText(view.nativeContent, view.viewport);
        updateExtractedText();
      }
      const hasFallback = Boolean(state.pages[view.index - 1]);
      view.line.textContent = 'İşlem hatası: ' + error.message + (hasFallback
        ? ' • Mevcut metin korundu.'
        : ' • PDF metnine dön veya yeniden dene.');
      view.line.classList.add('error');
      status(`Sayfa ${view.index} OCR hatası: ${error.message}`, true);
    }
    console.error('Sayfa metni:', error);
    return false;
  } finally {
    if (isCurrent()) { view.processing = false; updatePageButtons(view); }
  }
}

async function openBytes(bytes, label, mime="") {
  const openRun = ++state.run;
  try {
    const converted=await normalizeToPdf(bytes,label,mime);
    if(openRun!==state.run)return;
    const pdf=await pdfjs.getDocument({data:converted.bytes.slice()}).promise;
    if (openRun !== state.run) { pdf.destroy?.(); return; }
    const oldPdf = state.pdf;
    state.pdf = pdf;
    state.sourceBytes=converted.bytes;
    state.sourceName=converted.filename;
    state.zoom = 1;
    state.viewMode = 'width';
    document.title = `${label} · Türkçe PDF OCR`;
    if (oldPdf && oldPdf !== pdf) oldPdf.destroy?.().catch?.(() => {});
    selectionSync.clear(); await renderDocument();
  } catch (err) {
    if (openRun === state.run) status('Açılamadı: ' + err.message, true);
    console.error('PDF açma:', err);
  }
}

async function renderDocument() {
  if(!state.pdf)return;
  const run=++state.run;
  state.observer?.disconnect();
  state.busy=false;
  state.allTextReady=false;
  state.scanPromise=null;
  visualEditor.reset();
  smartInspector.reset();
  state.pages=Array(state.pdf.numPages).fill('');
  state.sheets=[];
  state.renderQueue=Promise.resolve();
  $('pages').replaceChildren();$('counter').textContent='';
  updateExtractedText();
  for(const id of ['reocr','native','fit','fitWidth','zoomIn','zoomOut','scanAll','exportPdf','editVisible','smartAnalyze']){
    $(id).disabled=false;
  }
  $('totalPages').textContent='/ '+state.pdf.numPages;
  $('pageNumber').max=String(state.pdf.numPages);
  $('pageNumber').value='1';
  status(state.pdf.numPages+' sayfa hazırlanıyor (görünür sayfalar önce)...');
  state.observer=new IntersectionObserver(entries=>{
    if(run!==state.run)return;
    for(const entry of entries)if(entry.isIntersecting){
      const view=state.sheets.find(v=>v.sheet===entry.target);
      if(view)enqueuePage(view,run);
    }
    boundCanvasMemory();
  },{root:$('pages'),rootMargin:'700px 0px',threshold:0.01});
  let count=0;
  for(let index=1;index<=state.pdf.numPages;index++){
    if(run!==state.run)return;
    try{
      const page=await state.pdf.getPage(index);
      if(run!==state.run)return;
      createPageView(page,index,state.pdf.numPages);
      count++;
    }catch(error){console.error('Sayfa kabuğu:',index,error);}
    if(index%12===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(run===state.run){
    visualEditor.syncControls();
    viewerTools.refresh();
    $('counter').textContent=count+'/'+state.pdf.numPages+' sayfa hazır';
    status('PDF açıldı. Görünen sayfalar yükleniyor; tüm sayfalar için "Tüm metni hazırla" kullanılabilir.');
    if(state.sheets[0])enqueuePage(state.sheets[0],run);
  }
}

async function loadSource(url) {
  if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url)) {
    throw new Error('Yalnızca HTTP(S) veya izinli yerel PDF adresleri desteklenir.');
  }
  const request = ++state.run;
  $('original').href = url;
  $('original').hidden = false;
  status('PDF adresinden açılıyor...');
  try {
    const resp = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!resp.ok) throw new Error(`Dosya alınamadı (HTTP ${resp.status}). "PDF seç" kullanabilirsin.`);
    if (/text\/html/i.test(resp.headers.get('content-type') || ''))
      throw new Error('Bu adres PDF/fotoğraf yerine bulut önizleme sayfası döndürüyor. OneDrive veya Outlook üzerinden dosyayı indirip "PDF seç" ile aç.');
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (request !== state.run) return; // Kullanıcı bu sırada başka PDF seçtiyse silme.
    await openBytes(bytes, new URL(url).pathname.split('/').pop() || 'PDF', resp.headers.get('content-type')||'');
  } catch (error) { if (request === state.run) throw error; }
}
async function loadWhatsappTransfer(id) {
  const send=async message=>{
    const response=await chrome.runtime.sendMessage(message);
    if(!response?.ok)throw new Error(response?.error||'Geçici belge aktarımı okunamadı.');
    return response;
  };
  try{
    status('Belge güvenli geçici depodan alınıyor...');
    const meta=await send({action:'waMeta',id});
    if(meta.size<5||meta.size>32*1024*1024||meta.count<1||meta.count>400)
      throw new Error('Aktarım boyutu geçersiz.');
    const bytes=new Uint8Array(meta.size);
    let position=0;
    for(let index=0;index<meta.count;index++){
      const part=await send({action:'waReadChunk',id,index});
      const raw=atob(part.base64);
      if(position+raw.length>bytes.length)throw new Error('Belge aktarım boyutu değişti.');
      for(let j=0;j<raw.length;j++)bytes[position+j]=raw.charCodeAt(j);
      position+=raw.length;
      status('Belge hazırlanıyor: %'+Math.round(position*100/meta.size));
    }
    if(position!==meta.size)throw new Error('Belge eksik geldi.');
    await openBytes(bytes,meta.name||'Belge.pdf',meta.mime||'');
  } catch(error){
    status('Ek dosya açılamadı: '+error.message+' • Dosyayı indirip PDF seç ile açabilirsin.',true);
  } finally {
    try{await chrome.runtime.sendMessage({action:'waDispose',id});}catch{}
  }
}
const waId = new URLSearchParams(location.search).get('wa');
if (waId && /^[a-f0-9-]{20,80}$/i.test(waId)) {
  loadWhatsappTransfer(waId);
}
const src = new URLSearchParams(location.search).get('src');
if (src) loadSource(src).catch(error => {
  // Eski PDF isteğinin hatası, yeni açılmış belge üstüne yazılmasın.
  status('Bağlantıdan PDF açılamadı: ' + error.message + ' • "PDF seç" ile açabilirsin.', true);
  console.error('PDF bağlantısı:', error);
});

const captureError = new URLSearchParams(location.search).get('captureError');
if (captureError && !waId && !src) status('Ek dosya yakalanamadı: ' + captureError.slice(0,500), true);
