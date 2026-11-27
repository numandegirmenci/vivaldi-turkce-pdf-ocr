// Recover actual ruled-table cells from page pixels, rather than guessing from words.
import {groupRows,ocrWordsToEntries,pdfTextToEntries} from './table-extract.mjs';

export function extractRuledTables(image,entries,page=1){
  const {width:w,height:h,data}=image;
  if(w<80||h<50||!entries?.length)return [];
  const dark=(x,y)=>{const i=(y*w+x)*4;return data[i+3]>100 && Math.max(data[i],data[i+1],data[i+2])<150;};
  const minLength=Math.max(65,w*.07), groups=[];
  const tol=Math.max(3,Math.round(w*.006));
  for(let y=0;y<h;y++){
    let start=-1,last=-1;
    const flush=()=>{
      if(start>=0 && last-start+1>=minLength){
        let g=groups.find(a=>Math.abs(a.left-start)<=tol&&Math.abs(a.right-last)<=tol);
        if(!g){g={left:start,right:last,ys:[]};groups.push(g);}
        if(!g.ys.length||y-g.ys.at(-1)>3)g.ys.push(y);
      }
      start=last=-1;
    };
    for(let x=0;x<w;x++){
      if(dark(x,y)){if(start<0)start=x;last=x;}
      else if(start>=0&&x-last>2)flush();
    }
    flush();
  }
  const results=[];
  for(const g of groups){
    if(g.ys.length<3)continue;
    // A large gap can belong to a merged/multiline cell; vertical continuity verifies it.
    const top=g.ys[0],bottom=g.ys.at(-1);
    if(bottom-top<20)continue;
    const xs=[];
    for(let x=Math.max(0,g.left-tol);x<=Math.min(w-1,g.right+tol);x++){
      let hits=0;
      for(let y=top;y<=bottom;y++)if(dark(x,y))hits++;
      if(hits/(bottom-top+1)>=.78){
        if(!xs.length||x-xs.at(-1)>3)xs.push(x);
      }
    }
    if(xs.length<3||xs.length>40||Math.abs(xs[0]-g.left)>tol||Math.abs(xs.at(-1)-g.right)>tol)continue;
    if(xs.some((x,i)=>i&&x-xs[i-1]<8))continue;
    const rows=[];
    for(let i=0;i<g.ys.length-1;i++){
      const a=g.ys[i],b=g.ys[i+1];if(b-a<5)continue;
      const row=[];
      for(let j=0;j<xs.length-1;j++){
        const left=xs[j],right=xs[j+1];
        const words=entries.filter(e=>e.y>a&&e.y<b&&(e.x+e.x1)/2>=left&&(e.x+e.x1)/2<right);
        row.push(groupRows(words).map(r=>r.words.map(e=>e.text).join(' ')).join(' ').trim());
      }
      rows.push(row);
    }
    const populated=rows.filter(r=>r.some(Boolean));
    if(populated.length<2||populated.reduce((n,r)=>n+r.filter(Boolean).length,0)<4)continue;
    const cols=xs.length-1;
    const headers=cols>2&&rows[0].filter(Boolean).length>=Math.ceil(cols/2)
      ?rows.shift().map((v,i)=>v||('Sütun '+(i+1)))
      :Array.from({length:cols},(_,i)=>'Sütun '+(i+1));
    results.push({page,kind:'grid',title:'Çizgili tablo',headers,rows,
      bounds:{x0:xs[0],x1:xs.at(-1),y0:top,y1:bottom},confidence:.85});
  }
  return results.sort((a,b)=>a.bounds.y0-b.bounds.y0);
}

export async function ruledTablesForView(view){
  const source=view.viewport;
  if(!view.page||!source)return [];
  const ratio=Math.min(1,1200/source.width,1600/source.height);
  const viewport=view.page.getViewport({scale:source.scale*ratio,rotation:source.rotation});
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  try{
    if(view.canvas?.width && view.canvas?.height)
      ctx.drawImage(view.canvas,0,0,canvas.width,canvas.height);
    else await view.page.render({canvasContext:ctx,viewport}).promise;
    const entries=view.textSource==='ocr'&&view.words?.length
      ?ocrWordsToEntries(view.words):pdfTextToEntries(view.nativeContent,source);
    const scaled=entries.map(e=>({...e,x:e.x*ratio,x1:e.x1*ratio,y:e.y*ratio,h:e.h*ratio}));
    const tables=extractRuledTables(ctx.getImageData(0,0,canvas.width,canvas.height),scaled,view.index);
    return tables.map(t=>({...t,bounds:Object.fromEntries(Object.entries(t.bounds).map(([k,v])=>[k,v/ratio]))}));
  }finally{canvas.width=canvas.height=0;}
}
