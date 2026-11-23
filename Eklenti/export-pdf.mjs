import {normalizeVisibleEdit,fitVisibleText,colorComponents} from './visual-edits.mjs';
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


/**
 * Render non-destructive visible text replacements onto a separate PDF copy.
 * This is NOT secure redaction: the original native PDF content may remain underneath.
 */
export async function createEditedPdf(sourceBytes,views,report=()=>{}) {
  const lib=globalThis.PDFLib,kit=globalThis.fontkit;
  if(!lib?.PDFDocument||!lib?.rgb||!kit)throw new Error('PDF düzenleme bileşenleri bulunamadı.');
  if(!sourceBytes?.length)throw new Error('Orijinal belge bulunamadı.');
  const edited=views.filter(v=>v.edits?.length);
  if(!edited.length)throw new Error('Kaydedilecek yazı değişikliği yok.');
  // Invisible OCR must not contain the original text of replaced scanned words.
  const filtered=views.map(view=>{
    const excluded=new Set();
    for(const edit of view.edits||[]){
      if(edit.sourceKind==='ocr'&&Number.isInteger(edit.sourceIndex))excluded.add(edit.sourceIndex);
      for(const index of edit.sourceIndices||[])excluded.add(index);
    }
    return {...view,words:(view.words||[]).filter((_,i)=>!excluded.has(i))};
  });
  const searchable=await createSearchablePdf(sourceBytes,filtered,report);
  const pdf=await lib.PDFDocument.load(searchable.bytes,{updateMetadata:false});
  pdf.registerFontkit(kit);
  const response=await fetch(chrome.runtime.getURL('vendor/NotoSans-Regular.ttf'));
  if(!response.ok)throw new Error('Türkçe yazı fontu yüklenemedi.');
  const font=await pdf.embedFont(await response.arrayBuffer(),{subset:true});
  let count=0;
  for(const view of edited){
    if(!view.viewport)throw new Error('Sayfa koordinatları bulunamadı.');
    if(view.rotation||view.page?.rotate)throw new Error('Döndürülmüş sayfada düzenleme kaydedilemiyor.');
    const page=pdf.getPages()[view.index-1];
    if(!page)throw new Error('Düzenlenen sayfa PDF içinde bulunamadı.');
    for(const raw of view.edits){
      const edit=normalizeVisibleEdit(raw,view.width,view.height);
      const a=view.viewport.convertToPdfPoint(edit.box.x0,edit.box.y0);
      const b=view.viewport.convertToPdfPoint(edit.box.x1,edit.box.y1);
      const x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]);
      const width=Math.abs(b[0]-a[0]),height=Math.abs(b[1]-a[1]);
      if(width<1||height<1)throw new Error('PDF üzerinde düzenleme alanı çok küçük.');
      const fill=colorComponents(edit.fill),ink=colorComponents(edit.ink);
      const pxW=edit.box.x1-edit.box.x0;
      const pointRatio=width/pxW;
      const preferred=edit.fontSize*pointRatio;
      const plan=fitVisibleText(edit.text,width,height,preferred,line=>font.widthOfTextAtSize(line,1));
      // Opaque patch visually replaces old print; do not claim secure document redaction.
      page.drawRectangle({x,y,width,height,color:lib.rgb(...fill),opacity:1});
      const baselineTop=y+height-plan.padding-plan.fontSize*.98;
      for(let i=0;i<plan.lines.length;i++){
        page.drawText(plan.lines[i],{
          x:x+plan.padding,
          y:baselineTop-i*plan.lineHeight,
          font,size:plan.fontSize,color:lib.rgb(...ink)
        });
      }
      count++;
    }
    report('Sayfa '+view.index+': '+view.edits.length+' görünür düzenleme işlendi.');
  }
  return {bytes:await pdf.save({useObjectStreams:true,addDefaultPage:false}),
    count,ocrCount:searchable.count};
}

export function saveBytesAsPdf(bytes, originalName, suffix='aranabilir') {
  const filename=String(originalName||'belge.pdf').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]/g,'_')+'-'+String(suffix).replace(/[^a-z0-9_-]/gi,'')+'.pdf';
  const objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');
  link.href=objectUrl;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
  return filename;
}
