import * as pdfjs from './vendor/pdf.mjs';
import { hasUsablePdfText, formatPdfText, collectOcrWords, getSafeRenderScale } from './text-utils.mjs';

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
};

$('choose').onclick = () => $('file').click();
$('file').onchange = async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  $('original').hidden = true; $('original').removeAttribute('href');
  // PDF bağlantısındaki geç yüklenen bir istek, seçilen dosyanın üzerine yazmasın.
  const request = ++state.run;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (request === state.run) await openBytes(bytes, file.name);
  } catch (err) { if (request === state.run) status('Dosya okunamadı: ' + err.message, true); }
};
$('copyAll').onclick = copyText;
$('copyOne').onclick = copyText;
$('original').onclick = async event => {
  event.preventDefault();
  if (!$('original').href) return;
  try {
    const result = await chrome.runtime.sendMessage({ action: 'openOriginal', url: $('original').href });
    if (!result?.ok) status('Orijinal PDF açılamadı: ' + (result?.error || 'Bilinmeyen hata'), true);
  } catch (error) { status('Orijinal PDF açılamadı: ' + error.message, true); }
};
$('reocr').onclick = () => state.pdf && renderDocument(true);
$('native').onclick = () => state.pdf && renderDocument(false);
$('zoomOut').onclick = () => setZoom(state.zoom / 1.25);
$('zoomIn').onclick = () => setZoom(state.zoom * 1.25);
$('fit').onclick = () => { state.viewMode='page'; state.zoom=1; applyZoom(); };
$('fitWidth').onclick = () => { state.viewMode='width'; state.zoom=1; applyZoom(); };
new ResizeObserver(applyZoom).observe($('pages'));

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
    const fitWidth = Math.min(1, availableWidth / width);
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
      await worker.setParameters({ preserve_interword_spaces: '1' });
      return worker;
    }).catch(err => {
      state.workerPromise = null; // Bir sonraki denemede tekrar oluşturulabilir.
      throw err;
    });
  }
  return state.workerPromise;
}

function recognizeSerially(canvas, stillCurrent) {
  // Tek Tesseract worker ile iki sayfayı aynı anda recognize etmek desteklenmez.
  const task = state.ocrQueue.then(async () => {
    if (!stillCurrent()) return null;
    const worker = await prepareWorker();
    if (!stillCurrent()) return null;
    return worker.recognize(canvas, {}, { text: true, blocks: true, tsv: true });
  });
  state.ocrQueue = task.catch(() => {});
  return task;
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
  for (const word of words) {
    const { x0, y0, x1, y1 } = word.bbox;
    const span = document.createElement('span');
    const fontHeight = Math.max(7, y1 - y0);
    span.textContent = word.text + ' ';
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
  const scale = getSafeRenderScale(page.getViewport({ scale: 1 }), count);
  const viewport = page.getViewport({ scale });
  const { width, height } = viewport;
  const sheet = document.createElement('article'); sheet.className = 'sheet';
  const title = document.createElement('div'); title.className = 'sheet-title';
  const titleLabel = document.createElement('span');
  titleLabel.textContent = `Sayfa ${index} / ${count}`;
  const pageTools = document.createElement('div'); pageTools.className = 'sheet-tools';
  const originalBtn = document.createElement('button');
  originalBtn.textContent = 'PDF metni';
  originalBtn.title = 'Bu sayfadaki hazır metni kullan';
  const ocrBtn = document.createElement('button');
  ocrBtn.textContent = 'Bu sayfaya OCR';
  ocrBtn.title = 'Yalnız bu sayfayı yeniden OCR ile oku';
  pageTools.append(originalBtn, ocrBtn);
  title.append(titleLabel, pageTools);
  const frame = document.createElement('div'); frame.className = 'page-img';
  const surface = document.createElement('div'); surface.className = 'page-surface';
  surface.style.width = `${width}px`;
  surface.style.height = `${height}px`;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  surface.append(canvas); frame.append(surface);
  const line = document.createElement('div'); line.className = 'sheet-status';
  line.textContent = 'Görüntüleniyor...';
  sheet.append(title, frame, line); $('pages').append(sheet);
  const view = {
    index, page, viewport, width, height, sheet, frame, surface, canvas, line,
    originalBtn, ocrBtn, nativeContent: null, token: 0, currentLayer: null,
  };
  state.sheets.push(view);
  originalBtn.disabled = ocrBtn.disabled = true;
  originalBtn.onclick = () => { if (!state.busy) processPageText(view, false, state.run); };
  ocrBtn.onclick = () => { if (!state.busy) processPageText(view, true, state.run); };
  applyZoom();
  return view;
}

function updatePageButtons(view) {
  const locked = state.busy || view.processing;
  view.originalBtn.disabled = locked || !hasUsablePdfText(view.nativeContent);
  view.ocrBtn.disabled = locked;
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
      const response = await recognizeSerially(view.canvas, isCurrent);
      if (!isCurrent() || !response) return;
      const data = response.data || {};
      pageText = (data.text || '').trim();
      // Seçilebilir sözcük alanı yalnızca OCR tamamlanınca oluşturulur.
      const result = addWordsLayer(view.surface, data, view.canvas.width, view.canvas.height);
      newLayer = result.layer;
      message = result.count
        ? `OCR tamamlandı: ${result.count} seçilebilir sözcük.`
        : (pageText ? 'OCR metni sağda var ancak kelime koordinatı bulunamadı.' : 'Okunabilir metin bulunamadı.');
    }
    if (!isCurrent()) { newLayer?.remove(); return; }
    if (previousLayer && previousLayer !== newLayer) previousLayer.remove();
    view.currentLayer = newLayer;
    state.pages[view.index - 1] = pageText;
    updateExtractedText();
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

async function openBytes(bytes, label) {
  const openRun = ++state.run;
  try {
    if (!bytes?.length || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
      throw new Error('Geçerli PDF bulunamadı; bağlantı bir giriş ekranına yönlenmiş olabilir.');
    }
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    if (openRun !== state.run) { pdf.destroy?.(); return; }
    const oldPdf = state.pdf;
    state.pdf = pdf;
    state.zoom = 1;
    state.viewMode = 'width';
    document.title = `${label} · Türkçe PDF OCR`;
    if (oldPdf && oldPdf !== pdf) oldPdf.destroy?.().catch?.(() => {});
    await renderDocument(false);
  } catch (err) {
    if (openRun === state.run) status('Açılamadı: ' + err.message, true);
    console.error('PDF açma:', err);
  }
}

async function renderDocument(forceOcr) {
  if (!state.pdf) return;
  const run = ++state.run;
  state.busy = true;
  state.pages = Array(state.pdf.numPages).fill('');
  state.sheets = [];
  $('pages').replaceChildren();
  $('counter').textContent = '';
  updateExtractedText();
  for (const id of ['reocr', 'native', 'fit', 'fitWidth', 'zoomIn', 'zoomOut']) {
    $(id).disabled = id === 'reocr' || id === 'native';
  }
  status(`${state.pdf.numPages} sayfa hazırlanıyor...`);
  let failed = 0;
  for (let index = 1; index <= state.pdf.numPages; index++) {
    if (run !== state.run) return;
    let view = null;
    try {
      const page = await state.pdf.getPage(index);
      if (run !== state.run) return;
      view = createPageView(page, index, state.pdf.numPages);
      const ctx = view.canvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (!ctx) throw new Error('Canvas başlatılamadı.');
      await page.render({ canvasContext: ctx, viewport: view.viewport }).promise;
      if (run !== state.run) return;
      view.nativeContent = await page.getTextContent();
      if (run !== state.run) return;
      const textOk = await processPageText(view, forceOcr, run);
      if (run !== state.run) return;
      if (!textOk) failed++;
    } catch (error) {
      if (run !== state.run) return;
      failed++;
      if (view) { view.line.textContent = 'Sayfa açılamadı: ' + error.message; view.line.classList.add('error'); }
      console.error(`Sayfa ${index} görüntülenemedi:`, error);
      status(`Sayfa ${index} hatası: ${error.message}`, true);
    }
    $('counter').textContent = `${index}/${state.pdf.numPages} sayfa` + (failed ? ` • ${failed} hata` : '');
  }
  if (run === state.run) {
    state.busy = false;
    for (const view of state.sheets) updatePageButtons(view);
    $('reocr').disabled = $('native').disabled = false;
    status(failed
      ? `İşlem tamamlandı; ${failed} sayfa hatalı. Hataları kontrol et.`
      : (forceOcr
          ? 'Zorunlu OCR tamamlandı. PDF metnine dönmek için "PDF metnini kullan" seç.'
          : 'Tamamlandı. Hazır metin korundu; gerektiğinde yalnız bir sayfaya OCR yapabilirsin.'));
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
    if (!resp.ok) throw new Error(`PDF alınamadı (HTTP ${resp.status}). "PDF seç" kullanabilirsin.`);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (request !== state.run) return; // Kullanıcı bu sırada başka PDF seçtiyse silme.
    await openBytes(bytes, new URL(url).pathname.split('/').pop() || 'PDF');
  } catch (error) { if (request === state.run) throw error; }
}
const src = new URLSearchParams(location.search).get('src');
if (src) loadSource(src).catch(error => {
  // Eski PDF isteğinin hatası, yeni açılmış belge üstüne yazılmasın.
  status('Bağlantıdan PDF açılamadı: ' + error.message + ' • "PDF seç" ile açabilirsin.', true);
  console.error('PDF bağlantısı:', error);
});
