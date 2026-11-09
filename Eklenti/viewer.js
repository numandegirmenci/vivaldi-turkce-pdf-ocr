import * as pdfjs from './vendor/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdf.worker.mjs');
const $ = id => document.getElementById(id);
const status = (s, bad=false) => { $('status').textContent=s; $('status').classList.toggle('error', bad); };
const state = {pdf:null, ocr:null, pages:[], run:0};

$('choose').onclick = () => $('file').click();
$('file').onchange = async e => {const f=e.target.files?.[0]; if(f) await openBytes(new Uint8Array(await f.arrayBuffer()), f.name);};
$('copyAll').onclick = async () => {await navigator.clipboard.writeText($('text').value);status('Tüm metin kopyalandı.');};
$('copyOne').onclick = async () => {await navigator.clipboard.writeText($('text').value);status('Metin panoya kopyalandı.');};
$('reocr').onclick = async () => {if(state.pdf) await renderDocument(true);};

async function prepareWorker() {
  if (!state.ocr) {
    status('Türkçe OCR motoru hazırlanıyor...');
    state.ocr = await window.Tesseract.createWorker('tur', 1, {
      workerBlobURL: false,
      workerPath: chrome.runtime.getURL('vendor/worker.min.js'),
      corePath: chrome.runtime.getURL('vendor/core'),
      langPath: chrome.runtime.getURL('vendor/lang'),
      gzip: true,
      logger: evt => {if(evt.status === 'recognizing text' && evt.progress) status(`OCR ilerliyor: %${Math.round(evt.progress*100)}`);}
    });
    await state.ocr.setParameters({preserve_interword_spaces: '1'});
  }
  return state.ocr;
}
function addWordsLayer(holder, data, w, h) {
  const layer = document.createElement('div'); layer.className='ocr-layer';
  const words = data.words || [];
  if (!words.length) {
    // Some newer Tesseract builds expose text but no word boxes.
    layer.title='Bu sayfanın OCR metni sağ paneldedir.';
  }
  for (const word of words) {
    if(!word.text?.trim() || !word.bbox) continue;
    const {x0,y0,x1,y1}=word.bbox;
    const sp=document.createElement('span');sp.textContent=word.text+' ';
    const bh=Math.max(6,y1-y0), bw=Math.max(6,x1-x0);
    const fontSize=Math.max(7,bh*0.90);
    sp.style.left=`${x0}px`;sp.style.top=`${y0}px`;sp.style.fontSize=`${fontSize}px`;
    layer.append(sp);
    const natural=sp.getBoundingClientRect().width || bw;
    sp.style.transform=`scaleX(${Math.max(.12,Math.min(6,bw/natural)).toFixed(3)})`;
  }
  layer.style.width=`${w}px`; layer.style.height=`${h}px`;
  holder.append(layer);
}
async function openBytes(bytes, label) {
  try {
    state.run++;
    if (!bytes?.length || String.fromCharCode(...bytes.slice(0,5)) !== '%PDF-') throw new Error('Dosya geçerli bir PDF değil. İndirme bağlantısı giriş sayfasına yönlenmiş olabilir.');
    state.pdf = await pdfjs.getDocument({data:bytes}).promise;
    document.title = `${label} · Türkçe PDF OCR`;
    await renderDocument(false);
  } catch (err) { status('Açılamadı: '+err.message,true);console.error(err); }
}
async function renderDocument(force) {
  const currentRun=++state.run;
  state.pages=[];
  $('pages').replaceChildren();$('text').value='';
  $('copyAll').disabled=true;$('reocr').disabled=false;
  let count = 0;
  status(`${state.pdf.numPages} sayfa hazırlanıyor...`);
  for (let index=1; index<=state.pdf.numPages; index++) {
    if (state.run !== currentRun) return;
    const page=await state.pdf.getPage(index);
    const scale=1.8, viewport=page.getViewport({scale});
    const shell=document.createElement('article');shell.className='sheet';
    const title=document.createElement('div');title.className='sheet-title';title.textContent=`Sayfa ${index} / ${state.pdf.numPages}`;
    const frame=document.createElement('div');frame.className='page-img';frame.style.width=`${Math.round(viewport.width)}px`; frame.style.height=`${Math.round(viewport.height)}px`;
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const line=document.createElement('div');line.className='sheet-status';line.textContent='Sayfa hazırlanıyor...';
    frame.append(canvas);shell.append(title,frame,line);$('pages').append(shell);
    await page.render({canvasContext:ctx,viewport}).promise;
    const tc=await page.getTextContent();
    const native=tc.items.map(item=>item.str||'').join(' ').trim();
    // Even a PDF with a native header can contain scanned body text.
    const useNative = !force && native.replace(/\s/g,'').length>=250;
    let pageText='';
    if (useNative) {
      const layer=document.createElement('div');layer.className='textLayer';
      layer.style.width=`${viewport.width}px`;layer.style.height=`${viewport.height}px`;
      frame.append(layer);
      try {await new pdfjs.TextLayer({textContentSource:tc,container:layer,viewport}).render();}
      catch(e) {console.warn('Yerleşik metin katmanı:',e);layer.remove();}
      pageText=native;line.textContent='PDF metin katmanı kullanıldı.';
    } else {
      line.textContent='Türkçe OCR yapılıyor...';status(`Sayfa ${index}/${state.pdf.numPages}: Türkçe OCR`);
      try {
        const worker=await prepareWorker();
        const result=await worker.recognize(canvas);
        const data=result.data||{};
        pageText=(data.text||'').trim();
        addWordsLayer(frame,data,canvas.width,canvas.height);
        line.textContent='OCR tamamlandı • Metni fareyle seç veya sağ panelden kopyala.';
      } catch(err) {
        line.textContent='OCR hatası: '+err.message;
        line.classList.add('error');console.error(err);
      }
    }
    state.pages.push(pageText);
    $('text').value=state.pages.map((t,i)=>`--- Sayfa ${i+1} ---\n${t}`).join('\n\n');
    $('copyAll').disabled=false;count=index;$('counter').textContent=`${count}/${state.pdf.numPages} sayfa`;
  }
  status('Tamamlandı. PDF üzerindeki OCR metnini seçip Ctrl+C yapabilir veya sağdaki metni kopyalayabilirsin.');
}
async function loadSource(url) {
  if (!/^https?:\/\//.test(url) && !/^file:\/\//.test(url)) throw new Error('Yalnızca http(s) veya izinli dosya adresleri desteklenir.');
  $('original').href=url;$('original').hidden=false;
  status('PDF kaynağı açılıyor...');
  const resp=await fetch(url,{credentials:'include',cache:'no-store'});
  if(!resp.ok) throw new Error(`PDF alınamadı (HTTP ${resp.status}). İzin gerektiren belgede Dosya seç kullanabilirsin.`);
  const bytes=new Uint8Array(await resp.arrayBuffer());
  await openBytes(bytes,new URL(url).pathname.split('/').pop()||'PDF');
}
const src=new URLSearchParams(location.search).get('src');
if(src) loadSource(src).catch(err=>{status('PDF bağlantısından açılamadı: '+err.message+' | PDF dosyasını indirip "PDF seç" ile açabilirsin.',true);console.error(err);});
