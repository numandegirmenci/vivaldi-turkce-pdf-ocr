/**
 * Compare multiple Tesseract passes for ONE local crop. Independent of main
 * page OCR and does not overwrite the original text or page image.
 */
import {assessCandidates} from './smart-regions.mjs';
import {preprocessRegionPixels,canvasFromPixels,rotateRegion,unwrapCircularStamp} from './smart-image.mjs';

export function ocrRegionPlan(kind,advanced=false){
  switch(kind){
    case 'print':return [
      {mode:'original',psm:6,name:'Basılı metin · özgün'},
      {mode:'contrast',psm:7,name:'Basılı metin · tek satır'},
      ...(advanced?[{mode:'paper',psm:11,name:'Basılı metin · filigran azalt'}]:[])
    ];
    case 'handwriting':return [
      {mode:'blue-pen',psm:7,name:'El yazısı · renk ayrımı'},
      {mode:'original',psm:13,name:'El yazısı · ham satır'},
      {mode:'contrast',psm:6,name:'El yazısı · blok denemesi'},
      ...(advanced?[{mode:'blue-pen',psm:11,name:'El yazısı · seyrek'}]:[])
    ];
    case 'stamp':return [
      {mode:'stamp',psm:6,name:'Kaşe · yatay yazı'},
      {mode:'stamp',psm:11,name:'Kaşe · parçalı'},
      {mode:'stamp',psm:7,rotate:15,name:'Kaşe · +15°'},
      {mode:'stamp',psm:7,rotate:-15,name:'Kaşe · −15°'},
      ...(advanced?[{mode:'ring',psm:7,name:'Kaşe · dairesel yazı açılımı'}]:[])
    ];
    case 'signature':return [];
    default:return [
      {mode:'original',psm:6,name:'Bölge · normal'},
      {mode:'paper',psm:11,name:'Bölge · filigran azaltılmış'},
      {mode:'contrast',psm:7,name:'Bölge · satır'}
    ];
  }
}
export function createRegionJobs(source,kind,{advanced=false}={}){
  if(!source?.width||!source?.height)throw new Error('Okunacak bölge bulunamadı.');
  const raw=source.getContext('2d',{willReadFrequently:true})
    .getImageData(0,0,source.width,source.height);
  return ocrRegionPlan(kind,advanced).map(plan=>{
    let canvas;
    if(plan.mode==='ring')canvas=unwrapCircularStamp(source);
    else{
      canvas=canvasFromPixels(preprocessRegionPixels(raw,plan.mode));
      if(plan.rotate)canvas=rotateRegion(canvas,plan.rotate);
    }
    return {...plan,canvas};
  });
}
/** Worker invocation (passed in from viewer.js) is serialized with main OCR. */
export async function recognizeRegionJobs(jobs,recognize,notify=()=>{}){
  if(!jobs.length)return assessCandidates([]);
  const entries=[];
  for(let i=0;i<jobs.length;i++){
    const job=jobs[i];
    notify('Bölge okuma '+(i+1)+'/'+jobs.length+': '+job.name);
    try{
      const data=await recognize(job);
      entries.push({name:job.name,mode:job.mode,psm:job.psm,
        text:String(data?.text||'').trim(),
        confidence:Number.isFinite(Number(data?.confidence))?Number(data.confidence):null});
    }catch(error){
      entries.push({name:job.name,text:'',confidence:null,error:String(error?.message||error)});
    }finally{
      // Avoid accumulating multiple large OCR bitmaps in RAM.
      job.canvas.width=0;job.canvas.height=0;
    }
  }
  return assessCandidates(entries);
}
export function confidenceLabel(result){
  if(!result?.candidates?.length)return 'Okunamadı: metin tahmin edilmedi.';
  if(result.uncertain)return 'Düşük güven / uyuşmayan okumalar; otomatik doğrulanmadı.';
  return 'Yüksek güven: adaylar birbirine yakın.';
}
