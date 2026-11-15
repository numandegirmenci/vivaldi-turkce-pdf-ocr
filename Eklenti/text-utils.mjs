/**
 * PDF'deki mevcut metni Tesseract ile değiştirmeden kullanmak için yardımcılar.
 * Bu dosya ayrıca gerçek PDF/Tesseract yüklemeden birim testine uygundur.
 */
export function hasUsablePdfText(textContent) {
  // Hazır bir metin katmanını, sayfa kısa diye yeniden OCR ile bozma.
  // Yalnız tek başına sayfa numarası gibi anlamsız izleri ayıkla.
  const items = (textContent?.items || []).map(item => String(item.str || '').trim()).filter(Boolean);
  const text = items.join(' ').trim();
  const meaningful = text.replace(/[^\p{L}\p{N}]/gu, '');
  if (!meaningful) return false;
  if (/^(?:sayfa|page)\s*\d{0,4}$/iu.test(text)) return false;
  return meaningful.length >= 8 || (items.length >= 2 && meaningful.length >= 4)
    || (meaningful.length >= 4 && /\p{L}/u.test(meaningful));
}

/** Çok sayfalı veya büyük PDF'ler tüm bellek alanını tüketmesin. */
export function getSafeRenderScale(viewportAtOne, pageCount=1) {
  const width = Number(viewportAtOne?.width);
  const height = Number(viewportAtOne?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) {
    throw new Error('PDF sayfa boyutu geçersiz.');
  }
  const pages = Math.max(1, Number(pageCount) || 1);
  const maxPixels = Math.min(3_000_000, 100_000_000 / pages);
  return Math.min(1.8, Math.sqrt(maxPixels / (width*height)), 8192/width, 8192/height);
}

/** PDF metnini görsel satır sırasına göre çıkarır; tablo hücrelerini tab ile ayırır. */
export function formatPdfText(textContent, viewport) {
  const entries = (textContent?.items || []).flatMap((item, index) => {
    if (typeof item.str !== 'string' || !item.str.trim()) return [];
    const m = item.transform || [1, 0, 0, 1, 0, 0];
    const p = viewport?.convertToViewportPoint
      ? viewport.convertToViewportPoint(m[4], m[5])
      : [m[4], -m[5]];
    return [{
      str: item.str,
      x: p[0], y: p[1],
      width: (Number(item.width) || 0) * (viewport?.scale || 1),
      height: Math.max(2, (Number(item.height) || Math.hypot(m[2], m[3]) || 10) * (viewport?.scale || 1)),
      index,
    }];
  });
  if (!entries.length) return '';
  const median = arr => [...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)];
  const lineHeight = median(entries.map(entry=>entry.height));
  const tolerance = Math.max(2, lineHeight * 0.40);
  entries.sort((a,b) => a.y - b.y || a.x - b.x || a.index - b.index);
  const rows = [];
  for (const entry of entries) {
    let row = rows.find(r => Math.abs(r.y-entry.y) <= tolerance);
    if (!row) { row={y:entry.y, entries:[]}; rows.push(row); }
    row.entries.push(entry);
  }
  return rows.sort((a,b)=>a.y-b.y).map(row => {
    row.entries.sort((a,b)=>a.x-b.x || a.index-b.index);
    let result='', prev=null;
    for (const item of row.entries) {
      if (prev) {
        const gap = item.x - (prev.x + prev.width);
        const threshold = Math.max(5, Math.min(prev.height, item.height)*0.6);
        if (gap > threshold*2) result += '\t';
        else if (gap > 1.5 && !/\s$/.test(result) && !/^\s/.test(item.str)) result += ' ';
      }
      result+=item.str;
      prev=item;
    }
    return result.trimEnd();
  }).filter(Boolean).join('\n');
}

/** Tesseract v5 sözcük kutuları, alternatif blok yapısı ve TSV desteği. */
export function collectOcrWords(data) {
  const words=[];
  const seen = new Set();
  const add = raw => {
    if (!raw || typeof raw.text !== 'string' || !raw.text.trim() || !raw.bbox) return;
    const {x0,y0,x1,y1}=raw.bbox;
    if (![x0,y0,x1,y1].every(Number.isFinite) || x1<=x0 || y1<=y0) return;
    const key=`${x0},${y0},${x1},${y1},${raw.text}`;
    if (!seen.has(key)) {seen.add(key);words.push({text:raw.text,bbox:{x0,y0,x1,y1}});}
  };
  if (Array.isArray(data?.words) && data.words.length) data.words.forEach(add);
  if (!words.length && Array.isArray(data?.blocks)) {
    const visit = (node, depth=0) => {
      if (!node || depth>8) return;
      if (Array.isArray(node)) {node.forEach(child=>visit(child,depth+1));return;}
      if (node.bbox && typeof node.text === 'string' && !node.words && !node.lines && !node.paragraphs && !node.blocks) add(node);
      for (const key of ['blocks','paragraphs','lines','words']) if (node[key]) visit(node[key],depth+1);
    };
    visit(data.blocks);
  }
  if (!words.length && typeof data?.tsv === 'string') {
    const lines=data.tsv.trim().split(/\r?\n/);
    const header=lines.shift()?.split('\t') || [];
    const col=name=>header.indexOf(name);
    const required=['level','left','top','width','height','text'];
    if (required.every(name=>col(name)>=0)) {
      for (const line of lines) {
        const row=line.split('\t');
        if (row[col('level')]!=='5') continue;
        const x=Number(row[col('left')]),y=Number(row[col('top')]);
        const width=Number(row[col('width')]),height=Number(row[col('height')]);
        add({text:row.slice(col('text')).join('\t'),bbox:{x0:x,y0:y,x1:x+width,y1:y+height}});
      }
    }
  }
  return words;
}
