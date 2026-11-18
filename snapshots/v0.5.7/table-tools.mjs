import {extractedTablesFromSheets,tablesToTsv,tablesToCsv,auditTable} from './table-extract.mjs';

/** Interactive table view: every cell is its own selectable DOM text. */
export function installTableTools({$,state,status,scanAll}) {

  if (!document.getElementById('v055-table-styles')) {
    const style=document.createElement('style');style.id='v055-table-styles';
    style.textContent=`
      .table-dialog {position:fixed;max-width:min(1150px,95vw);width:1050px;max-height:88vh;
        border:1px solid #93c1d4;border-radius:12px;padding:0;color:#173246;
        background:#fff;box-shadow:0 20px 60px #062c4d77;overflow:hidden}
      .table-dialog::backdrop{background:rgba(7,29,42,.60)}
      .table-dialog-toolbar{position:sticky;top:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
        background:#e9f6ff;padding:12px;border-bottom:1px solid #b8d9eb}
      .table-dialog-toolbar strong{flex:1;min-width:170px}
      .table-dialog-info{font-size:13px;padding:4px 14px;line-height:1.5}
      .table-dialog-body{padding:4px 14px 20px;overflow:auto;max-height:65vh}
      .table-dialog-body h3{font-size:14px;margin:0}
      .table-section{margin:16px 0 20px;border:1px solid #b9d5e4;border-radius:10px;padding:12px;background:#fff}
      .table-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px}
      .table-section-head button{font-size:12px;padding:5px 8px}
      .table-section-title{display:flex;flex-direction:column;gap:4px}
      .table-section-title small{font-size:11px;color:#687f8d}
      .table-scroll{overflow-x:auto;max-width:100%;border:1px solid #aac9dc;border-radius:7px}
      .table-scroll table{border-collapse:collapse;width:100%;min-width:660px;table-layout:auto}
      .table-scroll th,.table-scroll td{font:13px/1.45 'Segoe UI',sans-serif;padding:9px;
        border:1px solid #bed5e3;text-align:left;vertical-align:top;user-select:text}
      .table-scroll th{background:#dceffc;white-space:nowrap}
      .table-scroll tbody tr:nth-child(even){background:#f7fbff}
      .table-scroll tbody td:focus{outline:2px solid #1386bc;outline-offset:-2px}
      .table-scroll td::selection{background:#86d5ff;color:#10344e}
      .table-scroll td[contenteditable="true"]{cursor:text}
      .table-scroll td.table-warning{background:#fff1d2;border:2px solid #d97706}
      .table-scroll td.table-warning::after{content:' ⚠';font-size:11px;color:#a14f00}
      .table-dialog-info strong{color:#ad5c07}
    `;
    (document.head||document.documentElement).append(style);
  }

  const open=$('copyTable');
  open.textContent='▦ Tabloyu ayır';open.title='Görsel koordinatlara göre tablo satır ve sütunlarını ayır';
  for(const small of document.querySelectorAll('.brand small')){
    if(small.textContent?.includes('Yerel v0.5.'))
      small.textContent='Yerel v0.5.7 · çoklu tablo + alan/değer tanıma';
  }
  const dialog=document.createElement('dialog');dialog.className='table-dialog';
  dialog.setAttribute('aria-label','Ayrıştırılmış tablolar');
  const toolbar=document.createElement('div');toolbar.className='table-dialog-toolbar';
  const title=document.createElement('strong');title.textContent='Tablolar · satır ve sütun ayrımı';
  const excel=document.createElement('button');excel.type='button';excel.textContent='📋 Excel için kopyala';
  const csv=document.createElement('button');csv.type='button';csv.textContent='💾 CSV indir';
  const audit=document.createElement('button');audit.type='button';audit.textContent='✓ Sayıları kontrol et';
  const close=document.createElement('button');close.type='button';close.textContent='Kapat';
  toolbar.append(title,excel,csv,audit,close);
  const info=document.createElement('p');info.className='table-dialog-info';
  const area=document.createElement('div');area.className='table-dialog-body';
  dialog.append(toolbar,info,area);document.body.append(dialog);
  let found=[];
  function renderWarnings(){
    let count=0;
    const text=[];
    for(const table of found){
      const checked=auditTable(table);
      count+=checked.issues.length;
      for(const issue of checked.issues)text.push(`Sayfa ${table.page}, ${issue.row<0?'toplam':`${issue.row+1}. satır`}: ${issue.message}`);
    }
    const feeCount=found.filter(table=>table.kind==='fee'||table.headers?.length===4).length;
    const formCount=found.length-feeCount;
    info.textContent=`${found.length} ayrı tablo/bilgi grubu bulundu (${feeCount} ücret tablosu, ${formCount} alan-değer grubu). `+
      (count?`${count} hesap kontrolü uyarısı var. Turuncu hücreleri belgeyle karşılaştır. `:
        feeCount?'Ücret tablolarında belirgin hesap uyuşmazlığı bulunmadı. ':'')+
      'Hücreye tıklayıp hatalı OCR metnini düzeltebilirsin. Değişiklikler Excel/CSV çıktılarına yansır.';
    info.title=text.join('\n');
  }
  audit.addEventListener('click',()=>{present();status('Tablo hesapları yeniden kontrol edildi.');});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  excel.addEventListener('click',async()=>{
    if(!found.length)return;
    try{await navigator.clipboard.writeText(tablesToTsv(found));status('Tablo hücreleri sütunlara ayrılarak Excel için kopyalandı.');}
    catch(error){status('Tablo kopyalanamadı: '+error.message,true);}
  });
  csv.addEventListener('click',()=>{
    if(!found.length)return;
    const data='\ufeff'+tablesToCsv(found),blob=new Blob([data],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=(state.sourceName||'belge').replace(/\.[^.]+$/,'')+'_tablolar.csv';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  });
  function present(){
    area.replaceChildren();
    excel.disabled=csv.disabled=!found.length;
    if(!found.length){
      info.textContent='Bu belgede ücret tablosu ya da alan:değer grubu güvenilir biçimde bulunamadı. Form/tablo için gelişmiş OCR seçeneğini işaretleyip ilgili sayfada “Bu sayfaya OCR” düğmesini kullanarak tekrar deneyebilirsin. Belirsiz metinden sahte tablo üretilmez.';
      return;
    }
    renderWarnings();
    found.forEach((table,index)=>{
      const section=document.createElement('section');section.className='table-section';
      const head=document.createElement('div');head.className='table-section-head';
      const titleArea=document.createElement('div');titleArea.className='table-section-title';
      const caption=document.createElement('h3');caption.textContent=`Tablo ${index+1} · ${table.title||'Bilgi alanları'}`;
      const sub=document.createElement('small');sub.textContent=`Sayfa ${table.page} · ${table.rows.length} satır · ${table.headers.length} sütun`;
      titleArea.append(caption,sub);
      const copyButton=document.createElement('button');copyButton.type='button';copyButton.textContent='📋 Bu tabloyu kopyala';
      copyButton.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(tablesToTsv([table]));status(`Tablo ${index+1} kopyalandı.`);}
        catch(error){status('Tablo kopyalanamadı: '+error.message,true);}
      });
      head.append(titleArea,copyButton);section.append(head);area.append(section);
      const wrapper=document.createElement('div');wrapper.className='table-scroll';
      const tbl=document.createElement('table');
      const thead=document.createElement('thead'),tr=document.createElement('tr');
      table.headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.append(th);});thead.append(tr);tbl.append(thead);
      const tbody=document.createElement('tbody');
      table.rows.forEach((cells,rowIndex)=>{const row=document.createElement('tr');
        cells.forEach((value,colIndex)=>{
          const td=document.createElement('td');td.textContent=value;td.tabIndex=0;
          td.contentEditable='true';td.spellcheck=false;
          td.title='Hatalı okunduysa hücreyi düzenle; Ctrl+C ile kopyalayabilirsin.';
          td.addEventListener('input',()=>{
            table.rows[rowIndex][colIndex]=td.textContent.replace(/[\r\n]+/g,' ').trim();
            const audited=auditTable(table);
            table.issues=audited.issues;
            [...row.children].forEach((cell,j)=>{
              const problem=audited.issues.find(x=>x.row===rowIndex&&x.column===j);
              cell.classList.toggle('table-warning',Boolean(problem));
              if(problem)cell.title=problem.message+(problem.suggested?` Önerilen adet: ${problem.suggested} (hesap kontrolü)`:'');
            });
            renderWarnings();
          });
          const problem=(table.issues||[]).find(x=>x.row===rowIndex&&x.column===colIndex);
          if(problem){td.classList.add('table-warning');td.title=problem.message+
            (problem.suggested?` Hesaba göre adet önerisi: ${problem.suggested}; görselden doğrula.`:'');}
          row.append(td);
        });
        tbody.append(row);
      });tbl.append(tbody);wrapper.append(tbl);section.append(wrapper);
    });
  }
  open.onclick=async()=>{
    if(!state.pdf){status('Önce bir PDF aç.',true);return;}
    open.disabled=true;
    try{
      await scanAll(false);
      found=extractedTablesFromSheets(state.sheets).map(auditTable);
      present();
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    }catch(error){status('Tablo ayrıştırılamadı: '+error.message,true);}
    finally{open.disabled=false;}
  };
  return {refresh:present};
}
