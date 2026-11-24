import { getSafeRenderScale } from './text-utils.mjs';

export async function preparePrintPages(pdf, root, isCurrent, onProgress) {
  const urls = [];
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      if (!isCurrent()) throw new Error('Açık belge değişti.');
      onProgress(number, pdf.numPages);
      const page = await pdf.getPage(number);
      const dimensions = page.getViewport({scale:1});
      const viewport = page.getViewport({scale:getSafeRenderScale(dimensions, pdf.numPages)});
      const canvas = root.ownerDocument.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      let blob;
      try {
        await page.render({canvasContext:canvas.getContext('2d', {alpha:false}), viewport}).promise;
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      } finally {
        canvas.width = canvas.height = 0;
      }
      if (!blob) throw new Error('Sayfa görüntüsü hazırlanamadı.');
      const url = URL.createObjectURL(blob);
      urls.push(url);
      const sheet = root.ownerDocument.createElement('div');
      sheet.className = dimensions.width > dimensions.height ? 'print-sheet landscape' : 'print-sheet';
      const image = root.ownerDocument.createElement('img');
      image.alt = 'Sayfa ' + number;
      image.src = url;
      await image.decode();
      sheet.append(image);
      root.append(sheet);
    }
    if (!isCurrent()) throw new Error('Açık belge değişti.');
  } catch (error) {
    urls.forEach(url => URL.revokeObjectURL(url));
    throw error;
  }
  return () => urls.forEach(url => URL.revokeObjectURL(url));
}
