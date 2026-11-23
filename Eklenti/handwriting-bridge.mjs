/**
 * OPTIONAL true handwriting-recognition model, separate from Tesseract.
 * Model weights are downloaded only after an explicit user click, then cached
 * locally in the browser. Image data itself is never sent to a remote API.
 * The base TrOCR-small-handwritten model is English-centric and Turkish diacritics
 * are NOT reliable: output remains a low-confidence candidate for user review.
 */
import {pipeline,env} from '@huggingface/transformers';
let handwrittenPipeline=null;
env.allowRemoteModels=true;
env.allowLocalModels=false;
env.useBrowserCache=true;
env.backends.onnx.wasm.wasmPaths=globalThis.chrome?.runtime?.getURL?.('vendor/ort/')||'/Eklenti/vendor/ort/';
env.backends.onnx.wasm.numThreads=1;

export async function recognizeHandwriting(dataUrl,progress=()=>{}){
  if(!/^data:image\/(png|jpeg|webp);base64,/i.test(String(dataUrl||'')))
    throw new Error('El yazısı modeli yalnızca yerel görüntü verisi kabul eder.');
  if(!handwrittenPipeline){
    progress('El yazısı modeli ilk kullanımda indiriliyor; görüntü yüklenmiyor.');
    handwrittenPipeline=pipeline('image-to-text','Xenova/trocr-small-handwritten',{
      device:'wasm',dtype:'q8',
      progress_callback:event=>{
        if(event?.status==='progress'&&Number.isFinite(event.progress))
          progress('El yazısı modeli: %'+Math.round(event.progress));
      }
    }).catch(error=>{handwrittenPipeline=null;throw error;});
  }
  const inference=await handwrittenPipeline;
  progress('El yazısı, cihaz üzerinde modelle okunuyor...');
  const output=await inference(dataUrl,{max_new_tokens:96});
  const text=String(output?.[0]?.generated_text||'').trim();
  return {text,model:'Xenova/trocr-small-handwritten',
    note:'Model ağırlıkları İngilizce el yazısına odaklanır. Türkçe karakterler güvenilir olmayabilir.'};
}
