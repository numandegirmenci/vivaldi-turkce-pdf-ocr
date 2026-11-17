/** Yerel PDF'e, yalnız OCR gereken sayfalarda, görünmez Unicode metin ekler. */
export async function createSearchablePdf(sourceBytes, views, report=()=>{}) {
  const lib=globalThis.PDFLib;
  const kit=globalThis.fontkit;
  if(!lib?.PDFDocument || !kit)throw new Error('PDF dışa aktarma bileşenleri yüklenemedi.');
  if(!sourceBytes?.length)throw new Error('Orijinal PDF verisi bulunamadı.');
  const file=await lib.PDFDocument.load(sourceBytes,{updateMetadata:false});
  file.registerFontkit(kit);
  const fontRes=await fetch(chrome.runtime.getURL('vendor/NotoSans-Regular.ttf'));
  if(!fontRes.ok)throw new Error('Türkçe karakter fontu bulunamadı.');
  const font=await file.embedFont(await fontRes.arrayBuffer(),{subset:true});
  const pdfPages=file.getPages();
  let count=0;
  for(const view of views) {
    if(view.textSource!=='ocr' || !view.words?.length)continue;
    const page=pdfPages[view.index-1];
    if(!page || !view.viewport)continue;
    for(const word of view.words) {
      let str=String(word.text||'').replace(/[\x00-\x1f\x7f]/g,' ').trim();
      if(!str || str.length>200)continue;
      const {x0,x1,y0,y1}=word.bbox||{};
      if(![x0,x1,y0,y1].every(Number.isFinite) || x1<=x0 || y1<=y0)continue;
      try {
        // OCR kutusu, döndürme ve görüntü ölçeği dahil PDF koordinatlarına geri çevrilir.
        const a=view.viewport.convertToPdfPoint(x0,y0);
        const b=view.viewport.convertToPdfPoint(x1,y1);
        const x=Math.min(a[0],b[0]), y=Math.min(a[1],b[1]);
        const boxW=Math.abs(b[0]-a[0]), boxH=Math.abs(b[1]-a[1]);
        if(!boxW||!boxH)continue;
        const widthAtOne=font.widthOfTextAtSize(str,1);
        if(!widthAtOne)continue;
        const size=Math.min(Math.max(2,boxH*.8),boxW/widthAtOne);
        if(!Number.isFinite(size)||size<.5)continue;
        page.drawText(str,{x,y,size,font,opacity:0});
        count++;
      }catch(error){console.debug('OCR sözcüğü PDF katmanına aktarılamadı:',error);}
    }
    report('Sayfa '+view.index+'/'+views.length+' PDF içine işleniyor...');
  }
  if(!count)return {bytes:sourceBytes,count:0};
  const result=await file.save({useObjectStreams:true,addDefaultPage:false});
  return {bytes:result,count};
}

export function saveBytesAsPdf(bytes, originalName) {
  const filename=String(originalName||'belge.pdf').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]/g,'_')+'-aranabilir.pdf';
  const objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');
  link.href=objectUrl;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
  return filename;
}
