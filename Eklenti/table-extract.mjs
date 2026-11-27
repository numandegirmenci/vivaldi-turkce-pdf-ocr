/**
 * v0.5.5 — reconstruct structured tables from real OCR/PDF word coordinates.
 * Does not assume that the plain text output's tabs represent table cells.
 * Designed for fee/assessment documents with TÜRÜ | BİRİM FİYAT | ADET | TUTAR.
 * Rejects ambiguous pages instead of fabricating values.
 */
const FOLD = value => String(value??'').toLocaleUpperCase('tr-TR')
  .replace(/İ|I|ı/g,'I').replace(/Ü/g,'U').replace(/Ö/g,'O')
  .replace(/Ğ/g,'G').replace(/Ş/g,'S').replace(/Ç/g,'C')
  .replace(/[^A-Z0-9]/g,'');
const median = nums => [...nums].sort((a,b)=>a-b)[Math.floor(nums.length/2)]||10;

export function ocrWordsToEntries(words){
  return (words||[]).filter(w=>w?.text?.trim()&&w.bbox)
    .map(w=>({text:w.text.trim(),x:Number(w.bbox.x0),y:(Number(w.bbox.y0)+Number(w.bbox.y1))/2,
      x1:Number(w.bbox.x1),h:Number(w.bbox.y1)-Number(w.bbox.y0)}))
    .filter(w=>[w.x,w.y,w.x1,w.h].every(Number.isFinite)&&w.x1>w.x&&w.h>0);
}
export function pdfTextToEntries(content,viewport){
  return (content?.items||[]).filter(i=>typeof i.str==='string'&&i.str.trim())
    .map(item=>{
      const transform=item.transform||[1,0,0,1,0,0];
      const [x,y]=viewport?.convertToViewportPoint?.(transform[4],transform[5])||[transform[4],-transform[5]];
      const h=Math.max(2,Math.abs((Number(item.height)||10)*(viewport?.scale||1)));
      return {text:item.str.trim(),x,y:y-h*.5,x1:x+Math.max(1,(Number(item.width)||10)*(viewport?.scale||1)),h};
    }).filter(e=>[e.x,e.y,e.x1,e.h].every(Number.isFinite));
}
export function groupRows(entries){
  if(!entries.length)return [];
  const typical=median(entries.map(e=>e.h));
  const tolerance=Math.max(3,typical*.58);
  const rows=[];
  for(const entry of [...entries].sort((a,b)=>a.y-b.y||a.x-b.x)){
    let row=rows.find(r=>Math.abs(r.y-entry.y)<=tolerance);
    if(!row){row={y:entry.y,words:[]};rows.push(row);}
    row.words.push(entry);
    row.y=row.words.reduce((sum,w)=>sum+w.y,0)/row.words.length;
  }
  return rows.sort((a,b)=>a.y-b.y).map(r=>({...r,words:r.words.sort((a,b)=>a.x-b.x)}));
}
function headerPositions(row){
  const words=row.words, joined=words.map(w=>FOLD(w.text));
  const which={description:[],price:[],quantity:[],amount:[]};
  joined.forEach((name,index)=>{
    if(/^TURU?$/.test(name)||/^CINSI$/.test(name)||name==='ACIKLAMA')which.description.push(words[index]);
    if(name.startsWith('BIRIM')||name.startsWith('FIYAT')||name==='FIYATI')which.price.push(words[index]);
    if(name==='ADET'||name==='MIKTAR')which.quantity.push(words[index]);
    if(name==='TUTAR'||name==='TOPLAMTUTAR')which.amount.push(words[index]);
  });
  const num=Object.values(which).filter(arr=>arr.length).length;
  if(num<3||!which.price.length||!which.amount.length)return null;
  const x=key=>Math.min(...which[key].map(w=>w.x));
  let p=x('price'),q=which.quantity.length?x('quantity'):p+((x('amount')-p)*.5),a=x('amount');
  if(!(p<q&&q<a))return null;
  return {name:which.description.length?'TÜRÜ':'AÇIKLAMA',
    first:x('description')||0,price:p,quantity:q,amount:a,
    bounds:[p-Math.min(30,(q-p)*.2),q-Math.min(22,(q-p)*.15),a-Math.min(25,(a-q)*.15)]};
}
function classify(entry,bounds){
  // column boundaries by heading positions, not word count or whitespace
  const x=entry.x;
  if(x<bounds[0])return 0;
  if(x<bounds[1])return 1;
  if(x<bounds[2])return 2;
  return 3;
}
function valuesForRow(row,bounds){
  const cells=[[],[],[],[]];
  for(const w of row.words)cells[classify(w,bounds)].push(w.text);
  return cells.map(parts=>parts.join(' ').replace(/\s+/g,' ').trim());
}
function hasData(cells){
  return cells.filter(Boolean).length>=2&&(
    /\d/.test(cells[1])||/\d/.test(cells[2])||/\d/.test(cells[3]) || FOLD(cells.join(' ')).includes('TOPLAM'));
}
export function extractTables(entries,{page=1}={}){
  const rows=groupRows(entries);
  const tables=[];let consumed=-1;
  const typical=median(entries.map(e=>e.h));
  for(let i=0;i<rows.length;i++){
    if(i<=consumed)continue;
    const head=headerPositions(rows[i]);if(!head)continue;
    const result=[];let prev=rows[i].y,firstData=false;
    for(let j=i+1;j<Math.min(rows.length,i+45);j++){
      const row=rows[j];
      if(row.y-prev>Math.max(85,typical*5.5))break;
      const cells=valuesForRow(row,head.bounds);
      const plain=FOLD(cells.join(' '));
      if(headerPositions(row))break;
      if(hasData(cells)){
        // A printed TOTAL line is a summary, never a priced line item.
        if(plain.includes('TOPLAM')||plain.startsWith('YALNIZ')){
          const number=(cells.join(' ').match(/\d[\d.\s]*,\d{2}/g)||[]).at(-1);
          if(number)result.reportedTotal=number.replace(/\s+/g,'');
          consumed=j;break;
        }
        result.push(cells);firstData=true;prev=row.y;consumed=j;
      }else if(firstData&&row.y-prev>typical*2.5)break;
    }
    if(result.length>=2){
      tables.push({page,kind:'fee',title:'Ücret ve tutar tablosu',topY:rows[i].y,headers:[head.name,'BİRİM FİYAT','ADET','TUTAR'],rows:result,
        reportedTotal:result.reportedTotal||null,
        confidence:result.filter(r=>r.filter(Boolean).length>=3).length/result.length});
    }
  }
  return tables;
}

/**
 * Field/value documents are tables even when they do not have a TÜRÜ/ADET
 * header or inner cell borders. Examples: Tahakkuk information box and
 * bank/collection forms. This pass uses visible labels and their coordinates,
 * not money-shaped numbers, so unrelated prose is not converted into tables.
 */
const FIELD_LABELS = [
  ['Ödenen Toplam Tutar', /\bODENEN\s+TOPLAM\s+TUTAR\b/g],
  ['Ödenen Hesap/IBAN, Kart No', /\bODENEN\s+HESAP\s*\/?\s*IBAN(?:\s*,?\s*KART\s*NO)?\b/g],
  ['Tahakkuk Tipi', /\bTAHAKKUK\s+TIPI\b/g],
  ['Tahakkuk No', /\bTAHAKKUK\s+NO\b/g],
  ['Tarih / Saat', /\bTARIH\s*\/?\s*SAAT\b/g],
  ['Son Ödeme Tarihi', /\bSON\s+ODEME\s+TARIHI\b/g],
  ['Fatura Dönemi', /\bFATURA\s+DONEMI\b/g],
  ['Fatura Tutarı', /\bFATURA\s+TUTARI\b/g],
  ['Fatura No', /\bFATURA\s+NO\b/g],
  ['Kurum Adı', /\bKURUM\s+ADI\b/g],
  ['Abone No', /\bABONE\s+NO\b/g],
  ['Talep No', /\bTALEP\s+NO\b/g],
  ['Döviz Cinsi', /\bDOVIZ\s+CINSI\b/g],
  ['Aracılık Ücreti', /\bARACILIK\s+UCRETI\b/g],
  ['Ödenen Tutar', /\bODENEN\s+TUTAR\b/g],
  ['Birim', /\bBIRIM\b/g],
  ['BSMV', /\bBSMV\b/g],
  ['Açıklama', /\bACIKLAMA\b/g],
  ['Unvan', /\bUNVAN\b/g],
  ['Sicil No', /\bSICIL\s+NO\b/g],
];

// Retain whitespace and ':'; coordinate lookup still works for a PDF item
// that contains a complete "FATURA NO : 6719083" line in a single text run.
function foldLine(text) {
  return String(text||'').toLocaleUpperCase('tr-TR')
    .replace(/İ|I|ı/g,'I').replace(/Ü/g,'U').replace(/Ö/g,'O')
    .replace(/Ğ/g,'G').replace(/Ş/g,'S').replace(/Ç/g,'C');
}
function projectedLine(row) {
  let source=''; const spans=[];
  for (const word of row.words) {
    if(source)source+=' ';
    const start=source.length;
    source+=String(word.text||'');
    spans.push({start,end:source.length,x:word.x,x1:word.x1});
  }
  function xAt(offset) {
    const item=spans.find(w=>w.start<=offset&&offset<w.end)||spans.at(-1);
    if(!item)return 0;
    return item.x+(item.x1-item.x)*Math.max(0,Math.min(1,(offset-item.start)/Math.max(1,item.end-item.start)));
  }
  return {source,upper:foldLine(source),xAt,spans};
}

// Some scanners turn the colon between a form label and its value into a
// narrow '1', 'I', '|' or even a '3'.  Learn the separator COLUMN from multiple
// independent field rows. Never delete a digit just because it looks odd.
// This correction applies only to extracted field/value tables, not to the
// original OCR text or to prices, IBANs and other actual document content.
function labelMatches(upper) {
  const found=[];
  for(const [label,pattern] of FIELD_LABELS){
    pattern.lastIndex=0;
    let match;
    while((match=pattern.exec(upper))){
      found.push({label,start:match.index,end:match.index+match[0].length});
      if(!match[0].length)break;
    }
  }
  found.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
  const result=[];
  for(const hit of found)if(!result.some(old=>hit.start<old.end&&hit.end>old.start))result.push(hit);
  return result.sort((a,b)=>a.start-b.start);
}
function separatorCandidates(rows) {
  const candidates=[];
  for(const row of rows){
    const line=projectedLine(row), selected=labelMatches(line.upper);
    for(let i=0;i<selected.length;i++){
      const hit=selected[i],stop=selected[i+1]?.start??line.source.length;
      const tail=line.source.slice(hit.end,stop);
      // Candidate must be a SINGLE glyph and must have another actual value
      // token after it. A field whose entire value is '1' is never stripped.
      const match=/^\s*([:：|¦!Iıil13])\s+(\S[\s\S]*)$/u.exec(tail);
      if(!match||!match[2]?.trim())continue;
      const rawIndex=hit.end+tail.search(/\S/);
      const glyph=match[1];
      // Check apparent width; prohibit removing wide numerals or words.
      const token=line.spans.find(w=>w.start<=rawIndex&&rawIndex<w.end);
      const glyphStart=token?token.x:line.xAt(rawIndex);
      const glyphWidth=token?Math.max(0,(token.x1-token.x)/Math.max(1,token.end-token.start)):Infinity;
      const h=median(row.words.map(w=>w.h));
      if(glyphWidth>Math.max(13,h*1.12)&&glyph!==':')continue;
      candidates.push({x:glyphStart,letter:glyph,label:hit.label,y:row.y,h});
    }
  }
  const columns=[];
  for(const hit of candidates.sort((a,b)=>a.x-b.x)){
    const limit=Math.max(12,hit.h*1.1);
    let column=columns.find(col=>Math.abs(col.x-hit.x)<=limit);
    if(!column){column={x:hit.x,items:[]};columns.push(column);}
    column.items.push(hit);
    column.x=column.items.reduce((sum,item)=>sum+item.x,0)/column.items.length;
  }
  // Distinct labels are important: a malformed single row is not proof.
  return columns.filter(col=>new Set(col.items.map(item=>item.label)).size>=2)
    .map(col=>({x:col.x,h:median(col.items.map(item=>item.h))}));
}
function rowFields(row,separatorColumns=[]) {
  const {source,upper,xAt}=projectedLine(row);
  const selected=labelMatches(upper);
  const fields=[];
  for(let i=0;i<selected.length;i++) {
    const hit=selected[i];
    const stop=i+1<selected.length?selected[i+1].start:source.length;
    const tail=source.slice(hit.end,stop);
    // ':' after label is the strongest evidence that the text is a field.
    // Do not match a bare "BİRİM" heading or a sentence containing "fatura".
    const match=tail.match(/^\s*[:：]\s*(\S[\s\S]*)$/u);
    // Scanners sometimes drop the printed ':'. In that case only accept
    // numeric/date-looking values or a clearly separated next token.
    let value=match?.[1]?.trim()||'';
    if(!match){
      const first=tail.match(/^\s*([:：|¦!Iıil13])\s+(\S[\s\S]*)$/u);
      const start=hit.end+tail.search(/\S/);
      const glyphX=xAt(start), glyphH=median(row.words.map(w=>w.h));
      // Only a CONSENSUS separator column (found on other field rows) can
      // justify discarding a digit-shaped glyph. Do not apply to lone fields.
      const knownSeparator=first&&separatorColumns.some(col=>
        Math.abs(col.x-glyphX)<=Math.max(12,Math.min(col.h,glyphH)*1.1));
      if(knownSeparator){
        value=first[2].trim();
      } else {
        const fallback=tail.match(/^\s+([+-]?\d[\s\S]*)$/u);
        if(fallback)value=fallback[1].trim();
        else {
          const clearGap=start>hit.end&&xAt(start)-xAt(hit.end-1)>Math.max(25,glyphH*2.5);
          if(clearGap)value=tail.trim();
        }
      }
    }
    if(!value||/^[-–—:]+$/.test(value))continue;
    fields.push({label:hit.label,value,x:xAt(hit.start),y:row.y,
      x1:xAt(stop-1),h:median(row.words.map(w=>w.h))});
  }
  return fields;
}
function formTitle(fields) {
  const labels=new Set(fields.map(f=>f.label));
  if(labels.has('Tahakkuk No')||labels.has('Tahakkuk Tipi'))return 'Tahakkuk bilgileri';
  if(labels.has('Kurum Adı')||labels.has('Fatura No'))return 'Fatura ve ödeme bilgileri';
  if(labels.has('Ödenen Toplam Tutar')||labels.has('BSMV'))return 'Ödeme özeti';
  return 'Belge bilgi alanları';
}
export function extractFieldTables(entries,{page=1}={}) {
  if(!entries?.length)return [];
  const grouped=groupRows(entries);
  const separators=separatorCandidates(grouped);
  const all=grouped.flatMap(row=>rowFields(row,separators));
  if(all.length<2)return [];
  const height=median(entries.map(e=>e.h));
  const tracks=[];
  for(const field of all.sort((a,b)=>a.x-b.x||a.y-b.y)) {
    let track=tracks.find(t=>Math.abs(t.x-field.x)<Math.max(50,height*5.5));
    if(!track){track={x:field.x,fields:[]};tracks.push(track);}
    track.fields.push(field);
    track.x=(track.x*(track.fields.length-1)+field.x)/track.fields.length;
  }
  const result=[];
  for(const track of tracks){
    const ordered=track.fields.sort((a,b)=>a.y-b.y);
    // A blank gap separates boxes with the same left alignment.
    const gaps=ordered.slice(1).map((f,i)=>f.y-ordered[i].y).filter(x=>x>height*.65);
    const typicalGap=gaps.length?median(gaps):height*1.6;
    const cutoff=Math.max(height*2.8,typicalGap*1.65);
    let blocks=[],current=[];
    for(const field of ordered){
      if(current.length&&field.y-current.at(-1).y>cutoff){blocks.push(current);current=[];}
      current.push(field);
    }
    if(current.length)blocks.push(current);
    for(const block of blocks){
      const distinct=new Set(block.map(f=>f.label));
      if(block.length<2||distinct.size<2)continue;
      // Don't classify two unrelated stray labels as a table: either a
      // recognizable accounting/form key pair or at least three fields.
      const strong=block.some(f=>/Tahakkuk|Fatura|Kurum Adı|Ödenen|B[İI]SMV|Tarih|Talep No|Abone No/.test(f.label));
      if(!strong&&block.length<3)continue;
      result.push({page,kind:'fields',title:formTitle(block),
        headers:['ALAN','DEĞER'],rows:block.map(f=>[f.label,f.value]),
        bounds:{x0:Math.min(...block.map(f=>f.x)),y0:block[0].y,
          x1:Math.max(...block.map(f=>f.x1)),y1:block.at(-1).y},
        confidence:block.length>=3?0.9:0.75,reportedTotal:null});
    }
  }
  return result.sort((a,b)=>a.bounds.y0-b.bounds.y0||a.bounds.x0-b.bounds.x0);
}

export function extractedTablesFromSheets(sheets){
  const out=[];
  for(const view of sheets||[]){
    const entries=view.textSource==='ocr'&&view.words?.length
      ?ocrWordsToEntries(view.words):pdfTextToEntries(view.nativeContent,view.viewport);
    const fee=extractTables(entries,{page:view.index});
    const fields=extractFieldTables(entries,{page:view.index});
    // Preserve all independent layouts in reading order: metadata box and
    // priced rows remain separate tables, even when they share one page.
    out.push(...[...fee,...fields].sort((a,b)=>(a.topY??a.bounds?.y0??0)-(b.topY??b.bounds?.y0??0)));
  }
  return out;
}
export function tablesToTsv(tables){
  return (tables||[]).map(table=>[table.headers,...table.rows]
    .map(cells=>cells.map(v=>String(v??'').replace(/[\t\n\r]/g,' ')).join('\t')).join('\n')).join('\n\n');
}
export function tablesToCsv(tables){
  function escape(value){const s=String(value??'').replace(/[\r\n]/g,' ');return '"'+s.replace(/"/g,'""')+'"';}
  return (tables||[]).map(table=>[table.headers,...table.rows]
    .map(cells=>cells.map(escape).join(';')).join('\r\n')).join('\r\n\r\n');
}

/** Strict Turkish money parsing; a value like "10" is not interpreted as TL. */
export function moneyValue(text) {
  const source=String(text??'').trim();
  const hits=source.match(/\d[\d.\s]*,\d{2}(?!\d)/g)||[];
  if(hits.length!==1)return null;
  const clean=hits[0].replace(/\s/g,'');
  if(!/^\d+(?:\.\d{3})*,\d{2}$/.test(clean) && !/^\d+,\d{2}$/.test(clean))return null;
  const number=Number(clean.replace(/\./g,'').replace(',','.'));
  return Number.isFinite(number)?{value:number,clean}:null;
}
export function quantityValue(text) {
  const source=String(text??'').trim().replace(/\s+/g,'');
  if(!/^\d+(?:[.,]\d{1,3})?$/.test(source))return null;
  const value=Number(source.replace(',','.'));
  return Number.isFinite(value)?value:null;
}
/**
 * OCR never silently invents an accounting number. Only a unique, visibly
 * identifiable monetary amount is cleaned of OCR border/currency artifacts.
 */
export function auditTable(table) {
  if(table?.kind==='grid'||table?.kind==='fields'||table?.headers?.length!==4)
    return {...table,rows:(table?.rows||[]).map(row=>row.map(v=>String(v??'').trim())),issues:[]};
  const issues=[],rows=[];
  for(let i=0;i<(table.rows||[]).length;i++){
    const raw=table.rows[i];
    const cells=raw.map((item,j)=>{
      if(j!==1&&j!==3)return String(item||'').trim();
      return moneyValue(item)?.clean||String(item||'').trim();
    });
    rows.push(cells);
    const price=moneyValue(cells[1])?.value;
    const quantity=quantityValue(cells[2]);
    const amount=moneyValue(cells[3])?.value;
    if(price===undefined||amount===undefined){
      issues.push({row:i,column:price===undefined?1:3,message:'Tutar okunamadı; görseli kontrol et.'});
      continue;
    }
    if(quantity===null){
      issues.push({row:i,column:2,message:'Adet okunamadı; görseli kontrol et.'});
      continue;
    }
    const diff=Math.abs(price*quantity-amount);
    if(diff>0.021){
      const inferred=amount/price;
      const suggested=Number.isFinite(inferred)&&inferred>0&&inferred<1e7&&
        Math.abs(price*Math.round(inferred*1000)/1000-amount)<=0.02
        ?String(Math.round(inferred*1000)/1000):null;
      issues.push({row:i,column:2,message:`Hesap uyuşmuyor: ${cells[1]} × ${cells[2]} ≠ ${cells[3]}.`,
        suggested:suggested&&suggested!==String(quantity)?suggested:null});
    }
  }
  const reported=moneyValue(table.reportedTotal)?.value;
  const values=rows.map(c=>moneyValue(c[3])?.value);
  if(reported!==undefined&&reported!==null&&values.every(Number.isFinite)){
    const total=values.reduce((s,v)=>s+v,0);
    if(Math.abs(total-reported)>0.021)issues.push({row:-1,column:3,
      message:`Belge toplamı (${table.reportedTotal}) ile satır toplamı (${total.toFixed(2)}) uyuşmuyor.`});
  }
  return {...table,rows,issues};
}
