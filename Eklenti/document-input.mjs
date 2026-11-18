/** Additional local file formats. No document is uploaded to a server. */
const PDF_HEADER = [37,80,68,70,45];
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const IMAGE_EXT = {jpeg:'jpg',png:'png',webp:'webp',gif:'gif',bmp:'bmp'};

export function detectDocumentType(bytes, mime='', name='') {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const ext = String(name).split('.').pop().toLowerCase();
  const type = String(mime).toLowerCase().split(';')[0].trim();
  if (b.length >= 5 && PDF_HEADER.every((v,i)=>b[i]===v)) return 'pdf';
  if (b.length >= 8 && b[0]===137 && b[1]===80 && b[2]===78 && b[3]===71 && b[4]===13 && b[5]===10 && b[6]===26 && b[7]===10) return 'png';
  if (b.length >= 3 && b[0]===255 && b[1]===216 && b[2]===255) return 'jpeg';
  if (b.length >= 12 && String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP') return 'webp';
  if (b.length >= 6 && ['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)))) return 'gif';
  if (b.length >= 2 && b[0]===66 && b[1]===77) return 'bmp';
  if (b.length >= 4 && b[0]===80 && b[1]===75 && b[2]===3 && b[3]===4 &&
      (ext==='docx' || type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return 'docx';
  if (b.length >= 4 && b[0]===80 && b[1]===75 && b[2]===3 && b[3]===4 &&
      (ext==='xlsx' || type==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return 'xlsx';
  if (b.length >= 4 && b[0]===80 && b[1]===75 && b[2]===3 && b[3]===4 &&
      (ext==='pptx' || type==='application/vnd.openxmlformats-officedocument.presentationml.presentation')) return 'pptx';
  if (b.length >= 4 && b[0]===80 && b[1]===75 && b[2]===3 && b[3]===4 &&
      (ext==='odt' || type==='application/vnd.oasis.opendocument.text')) return 'odt';
  if (['txt','csv','md','log','json','xml','html','htm','rtf','tsv'].includes(ext) || ['text/plain','text/csv','text/markdown','text/html','application/json','text/xml','application/xml','text/tab-separated-values','application/rtf'].includes(type)) {
    if (b.length <= 0) return null;
    // Do not classify arbitrary binaries as text.
    if (b.slice(0,Math.min(b.length,512)).some(v=>v===0)) return null;
    return 'text';
  }
  return null;
}

function readText(bytes) {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const replacementCount=(utf8.match(/\uFFFD/g)||[]).length;
  return replacementCount>2 ? new TextDecoder('windows-1254').decode(bytes) : utf8;
}

/** Find entries through ZIP's central directory, never execute macros or linked resources. */
export async function extractDocxText(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view=new DataView(b.buffer,b.byteOffset,b.byteLength);
  let eocd=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){
    if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0)throw new Error('DOCX ZIP dizini okunamadı.');
  const count=view.getUint16(eocd+10,true),offset=view.getUint32(eocd+16,true);
  if(count>10000 || offset>=b.length)throw new Error('DOCX arşiv sınırları geçersiz.');
  let cursor=offset, xmlBytes=null;
  for(let n=0;n<count;n++){
    if(cursor+46>b.length || view.getUint32(cursor,true)!==0x02014b50)throw new Error('DOCX kayıtları bozuk.');
    const method=view.getUint16(cursor+10,true),size=view.getUint32(cursor+20,true),plainSize=view.getUint32(cursor+24,true);
    const len=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
    const filename=new TextDecoder().decode(b.slice(cursor+46,cursor+46+len));
    if(filename==='word/document.xml'){
      if(size>10*1024*1024 || plainSize>12*1024*1024)throw new Error('DOCX metni izin verilen boyutu aşıyor.');
      const local=view.getUint32(cursor+42,true);
      if(local+30>b.length || view.getUint32(local,true)!==0x04034b50)throw new Error('DOCX veri başlığı bozuk.');
      const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
      if(start+size>b.length)throw new Error('DOCX metni eksik.');
      const packed=b.slice(start,start+size);
      if(method===0)xmlBytes=packed;
      else if(method===8){
        if(typeof DecompressionStream==='undefined')throw new Error('Tarayıcı DOCX sıkıştırmasını desteklemiyor.');
        const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        xmlBytes=new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error('Desteklenmeyen DOCX sıkıştırma türü.');
      break;
    }
    cursor+=46+len+extra+comment;
  }
  if(!xmlBytes || xmlBytes.byteLength>12*1024*1024)throw new Error('DOCX ana metni bulunamadı veya çok büyük.');
  const xml=readText(xmlBytes);
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('DOCX XML içeriği okunamadı.');
  const paragraphs=[...doc.getElementsByTagNameNS(WORD_NS,'p')];
  const lines=paragraphs.map(p=>{
    const result=[];
    const walk=node=>{
      if(node.nodeType===1){
        if(node.namespaceURI===WORD_NS && node.localName==='t')result.push(node.textContent);
        else if(node.namespaceURI===WORD_NS && node.localName==='tab')result.push('\t');
        else if(node.namespaceURI===WORD_NS && (node.localName==='br'||node.localName==='cr'))result.push('\n');
        else for(const child of node.childNodes)walk(child);
      }
    };
    walk(p);return result.join('');
  });
  return lines.join('\n').trim();
}

/** Restricted OOXML spreadsheet extraction: values only, not formulas or macros. */
async function readZipEntries(bytes,wanted){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),view=new DataView(b.buffer,b.byteOffset,b.byteLength);
  let eocd=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
  if(eocd<0)throw new Error('XLSX arşiv dizini bozuk.');
  const count=view.getUint16(eocd+10,true),offset=view.getUint32(eocd+16,true);
  if(count>10000||offset>=b.length)throw new Error('XLSX dosyası geçersiz.');
  const entries=[];let cur=offset;
  for(let n=0;n<count;n++){
    if(cur+46>b.length||view.getUint32(cur,true)!==0x02014b50)throw new Error('XLSX kayıtları geçersiz.');
    const method=view.getUint16(cur+10,true),size=view.getUint32(cur+20,true),plain=view.getUint32(cur+24,true);
    const len=view.getUint16(cur+28,true),extra=view.getUint16(cur+30,true),comment=view.getUint16(cur+32,true);
    const name=new TextDecoder().decode(b.slice(cur+46,cur+46+len));
    if(wanted(name))entries.push({name,method,size,plain,local:view.getUint32(cur+42,true)});
    cur+=46+len+extra+comment;
  }
  if(entries.length>100)throw new Error('Belge çok fazla bölüm içeriyor.');
  const result=new Map();let total=0;
  for(const entry of entries){
    const {name,method,size,plain,local}=entry;
    if(size>10*1024*1024||plain>12*1024*1024)throw new Error('XLSX sayfası çok büyük.');
    total+=plain;if(total>24*1024*1024)throw new Error('Belgenin açılan metni çok büyük.');
    if(local+30>b.length||view.getUint32(local,true)!==0x04034b50)throw new Error('XLSX başlığı bozuk.');
    const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    if(start+size>b.length)throw new Error('XLSX veri uzunluğu hatalı.');
    const packed=b.slice(start,start+size);let data;
    if(method===0)data=packed;
    else if(method===8){
      if(typeof DecompressionStream==='undefined')throw new Error('XLSX sıkıştırması desteklenmiyor.');
      data=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }else throw new Error('Bilinmeyen XLSX sıkıştırma türü.');
    if(data.byteLength>12*1024*1024)throw new Error('XLSX açılan sayfa boyutu sınırı aşıldı.');
    result.set(name,new TextDecoder().decode(data));
  }
  return result;
}
export async function extractXlsxText(bytes){
  const xmls=await readZipEntries(bytes,name=>name==='xl/sharedStrings.xml'||/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const parser=new DOMParser();
  const docFor=xml=>{
    const doc=parser.parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('XLSX sayfası okunamadı.');return doc;
  };
  const xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const texts=[];
  if(xmls.has('xl/sharedStrings.xml')){
    const doc=docFor(xmls.get('xl/sharedStrings.xml'));
    for(const el of doc.getElementsByTagNameNS(xmlns,'si')){
      const parts=[...el.getElementsByTagNameNS(xmlns,'t')];
      texts.push(parts.map(p=>p.textContent).join(''));
    }
  }
  const sheets=[...xmls.entries()].filter(([n])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a,b)=>
    Number(a[0].match(/sheet(\d+)/)[1])-Number(b[0].match(/sheet(\d+)/)[1]));
  if(!sheets.length)throw new Error('XLSX çalışma sayfası bulunamadı.');
  const results=[];
  for(const [name,xml] of sheets){
    const doc=docFor(xml),rows=[...doc.getElementsByTagNameNS(xmlns,'row')];
    const lines=[];
    for(const row of rows.slice(0,5000)){
      const values=[];
      for(const cell of row.getElementsByTagNameNS(xmlns,'c')){
        const ref=String(cell.getAttribute('r')||'A1').match(/^([A-Z]+)\d+$/);
        if(!ref)continue;
        let col=0;for(const c of ref[1])col=col*26+c.charCodeAt(0)-64;
        if(col<1||col>120)continue;
        const type=cell.getAttribute('t')||'',val=cell.getElementsByTagNameNS(xmlns,'v')[0]?.textContent||'';
        if(type==='s')values[col-1]=texts[Number(val)]||'';
        else if(type==='inlineStr')values[col-1]=[...cell.getElementsByTagNameNS(xmlns,'t')].map(x=>x.textContent).join('');
        else values[col-1]=val;
      }
      lines.push(values.map(v=>v||'').join('\t'));
    }
    results.push('Çalışma sayfası '+name.match(/sheet(\d+)/)[1]+'\n'+lines.join('\n'));
  }
  return results.join('\n\n').slice(0,120000).trim();
}


/** Slides are extracted as text in reading order, without trying to reproduce layout. */
export async function extractPptxText(bytes) {
  const parts=await readZipEntries(bytes,n=>/^ppt\/slides\/slide[1-9]\d*\.xml$/.test(n));
  const slides=[...parts.entries()].sort((a,b)=>Number(a[0].match(/slide(\d+)/)[1])-Number(b[0].match(/slide(\d+)/)[1]));
  if(!slides.length)throw new Error('PPTX slayt metni bulunamadı.');
  const results=[];
  const ns='http://schemas.openxmlformats.org/drawingml/2006/main';
  for(const [name,xml] of slides) {
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('PPTX XML içeriği bozuk.');
    const paragraphs=[...doc.getElementsByTagNameNS(ns,'p')];
    const lines=paragraphs.map(p=>[...p.getElementsByTagNameNS(ns,'t')].map(t=>t.textContent).join('')).filter(Boolean);
    results.push('Slayt '+name.match(/slide(\d+)/)[1]+'\n'+lines.join('\n'));
  }
  return results.join('\n\n').slice(0,120000).trim();
}

/** OpenDocument text paragraphs, extracted locally. */
export async function extractOdtText(bytes) {
  const parts=await readZipEntries(bytes,n=>n==='content.xml');
  const xml=parts.get('content.xml');
  if(!xml)throw new Error('ODT metni bulunamadı.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('ODT XML içeriği bozuk.');
  const ns='urn:oasis:names:tc:opendocument:xmlns:text:1.0';
  return [...doc.getElementsByTagNameNS(ns,'p'),...doc.getElementsByTagNameNS(ns,'h')]
    .map(p=>p.textContent).filter(Boolean).join('\n').slice(0,120000).trim();
}

/** Format text without executing embedded scripts or HTML resources. */
function readStructuredText(bytes,name) {
  const ext=String(name).split('.').pop().toLowerCase(),raw=readText(bytes);
  if(['html','htm','xml'].includes(ext)) {
    const clean=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
      .replace(/<\/?(?:p|div|br|li|h[1-6]|tr)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ');
    return clean.replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<')
      .replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').trim();
  }
  if(ext==='rtf') return raw.replace(/\\'([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)))
    .replace(/\\par\b/gi,'\n').replace(/\\[a-z]+-?\d* ?/gi,'')
    .replace(/[{}]/g,'').trim();
  if(ext==='json') {try{return JSON.stringify(JSON.parse(raw),null,2);}catch{return raw;}}
  return raw;
}

function pdfName(filename){
  return String(filename||'belge').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_').slice(0,130)+'.pdf';
}
async function imageToPdf(bytes,kind) {
  const pdf=await globalThis.PDFLib.PDFDocument.create();
  let image;
  if(kind==='jpeg')image=await pdf.embedJpg(bytes);
  else if(kind==='png')image=await pdf.embedPng(bytes);
  else {
    const blob=new Blob([bytes],{type:'image/'+kind});
    const bitmap=await createImageBitmap(blob);
    try{
      if(bitmap.width*bitmap.height>28000000)throw new Error('Görsel çok büyük (28 MP sınırı).');
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      canvas.getContext('2d').drawImage(bitmap,0,0);
      const png=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Görsel dönüştürülemedi.')),'image/png'));
      image=await pdf.embedPng(await png.arrayBuffer());
      canvas.width=canvas.height=0;
    }finally{bitmap.close?.();}
  }
  if(image.width*image.height>28000000)throw new Error('Görsel çok büyük (28 MP sınırı).');
  // A4-like physical dimensions maintain enough pixels for OCR and legibility.
  const ratio=Math.min(595/image.width,842/image.height,1.5);
  const w=Math.max(1,image.width*ratio),h=Math.max(1,image.height*ratio);
  const page=pdf.addPage([w,h]);page.drawImage(image,{x:0,y:0,width:w,height:h});
  return new Uint8Array(await pdf.save());
}
async function textToPdf(content) {
  const pdf=await globalThis.PDFLib.PDFDocument.create();
  pdf.registerFontkit(globalThis.fontkit);
  const fontRes=await fetch(chrome.runtime.getURL('vendor/NotoSans-Regular.ttf'));
  if(!fontRes.ok)throw new Error('Yerel Türkçe font bulunamadı.');
  const font=await pdf.embedFont(await fontRes.arrayBuffer(),{subset:true});
  const maxChars=120000;
  if(content.length>maxChars)throw new Error('Metin 120.000 karakter sınırını aşıyor.');
  const size=10.5,margin=42,lineH=15,maxWidth=595-margin*2;
  let page=pdf.addPage([595,842]),y=800;
  const lines=content.replace(/\r\n?/g,'\n').replace(/\t/g,'    ').split('\n');
  for(const originalLine of lines){
    const parts=[...originalLine];let line='';
    const flush=()=>{if(y<45){page=pdf.addPage([595,842]);y=800;}if(line)page.drawText(line,{x:margin,y,size,font});y-=lineH;line='';};
    for(const char of parts){
      let validChar=char;
      try{font.encodeText(char)}catch{validChar='?'}
      if(font.widthOfTextAtSize(line+validChar,size)>maxWidth && line)flush();
      line+=validChar;
    }
    flush();
  }
  return new Uint8Array(await pdf.save());
}

export async function normalizeToPdf(bytes, name='belge', mime='') {
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
  if(!b.length || b.length>32*1024*1024)throw new Error('Dosya boş veya 32 MB sınırını aşıyor.');
  const kind=detectDocumentType(b,mime,name);
  if(!kind)throw new Error('Bu dosya türü desteklenmiyor. PDF, görsel, DOCX, XLSX, PPTX, ODT ve metin dosyası açabilirsin.');
  if(kind==='pdf')return {bytes:b,filename:pdfName(name),kind};
  if(IMAGE_EXT[kind])return {bytes:await imageToPdf(b,kind),filename:pdfName(name),kind};
  const content=kind==='docx'?await extractDocxText(b):kind==='xlsx'?await extractXlsxText(b):kind==='pptx'?await extractPptxText(b):kind==='odt'?await extractOdtText(b):readStructuredText(b,name);
  if(!content.trim())throw new Error('Dosyadan okunabilir metin çıkarılamadı.');
  return {bytes:await textToPdf(content),filename:pdfName(name),kind};
}
