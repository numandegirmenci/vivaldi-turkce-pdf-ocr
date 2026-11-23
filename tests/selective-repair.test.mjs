import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePaper,planSelectiveRemoval,combineSelectiveLayers,
  validateTransparentPatch,assertGlyphNotClipped} from '../Eklenti/selective-repair.mjs';

function scannedWord(w=108,h=46,opts={}){
  const data=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=(y*w+x)*4;
    const grain=(x*13+y*7)%5-2;
    const paper=opts.paper??247;
    const ink=(x>=13&&x<92&&y>=12&&y<33&&((x-13)%9)<4);
    const value=ink?(opts.ink??26):paper+grain;
    data[p]=data[p+1]=data[p+2]=value;
    data[p+3]=255;
  }
  return {width:w,height:h,data};
}
test('okunaklı taranmış metinde yalnız eski harf pikselleri temizlenir',()=>{
  const image=scannedWord();
  const result=planSelectiveRemoval(image,{ink:'#1a1a1a',fill:'#f7f7f7'});
  assert.ok(result.oldGlyphPixels>100);
  assert.ok(result.coverage>.03 && result.coverage<.6);
  for(let y=0;y<46;y++)for(let x=0;x<108;x++){
    const k=(y*108+x)*4+3;
    if(x<7||x>100||y<7||y>38)assert.equal(result.data[k],0,
      'uzak özgün sayfa pikseli şeffaf kalmalı');
  }
});
test('yeni harfler, orijinalin değişmemiş piksel alanlarını koruyacak şekilde birleştirilir',()=>{
  const image=scannedWord();
  const cleanup=planSelectiveRemoval(image,{ink:'#1a1a1a',fill:'#f7f7f7'});
  const glyph=new Uint8ClampedArray(image.data.length);
  for(let y=14;y<31;y++)for(let x=35;x<39;x++)
    glyph[(y*image.width+x)*4+3]=255;
  const combined=combineSelectiveLayers(cleanup,glyph,'#1a1a1a');
  assert.equal(validateTransparentPatch(combined,cleanup,glyph),true);
  let count=0;
  for(let p=0;p<glyph.length;p+=4){
    if(!cleanup.data[p+3]&&!glyph[p+3]){
      assert.equal(combined.data[p+3],0,'dokunulmayan tüm pikseller saydam');
      count++;
    }
  }
  assert.ok(count>image.width*image.height*.45);
  const point=(21*image.width+36)*4;
  assert.equal(combined.data[point+3],255,'yeni harf şeffaflık katmanına yazılmalı');
});
test('kağıt rengi sarı arama işaretinden değil gerçek taranmış piksellerden belirlenir',()=>{
  const paper=estimatePaper(scannedWord(), '#ffff00');
  assert.ok(paper.color.every(v=>v>=243&&v<=251));
  assert.ok(paper.uniformity>.8);
});
test('metin başka bir kelimeyle iç içe giriyorsa kenar güvenliği hata verir',()=>{
  const image=scannedWord();
  // Black stroke leaks into the left boundary: it may belong to a neighbor.
  for(let y=6;y<41;y++)for(let x=0;x<2;x++){
    const p=(y*image.width+x)*4;
    image.data[p]=image.data[p+1]=image.data[p+2]=22;
  }
  assert.throws(()=>planSelectiveRemoval(image,{ink:'#1a1a1a',fill:'#f7f7f7'}),
    /kenarına taşıyor/);
});
test('çok az kontrastlı / başarısız OCR alanı orijinal görüntüyü korur',()=>{
  const image=scannedWord(108,46,{paper:155,ink:140});
  assert.throws(()=>planSelectiveRemoval(image,{ink:'#8c8c8c',fill:'#9b9b9b'}),
    /fark güvenle ayırt edilemiyor/);
});
test('dokulu görselin tamamını beyaz kapamak yerine değiştirme reddedilir',()=>{
  const image=scannedWord();
  for(let y=0;y<46;y++)for(let x=0;x<108;x++){
    const p=(y*108+x)*4;
    if((x+y)%2===0){
      image.data[p]=250;image.data[p+1]=172;image.data[p+2]=33;
    }else{
      image.data[p]=39;image.data[p+1]=100;image.data[p+2]=198;
    }
  }
  assert.throws(()=>planSelectiveRemoval(image,{ink:'#1a1a1a',fill:'#f7f7f7'}));
});

test('yeni yazı görüntü kenarından kesilirse önce kontrol edilir, görüntü değişmez',()=>{
  const glyph=new Uint8ClampedArray(40*20*4);
  glyph[(10*40+39)*4+3]=255;glyph[(11*40+39)*4+3]=255;
  glyph[(12*40+39)*4+3]=255;
  assert.throws(()=>assertGlyphNotClipped(glyph,40,20),/Daha geniş alan/);
});
test('saydam yama yoksa çevredeki görüntüyü değiştiren bir alan kabul edilmez',()=>{
  const clean={width:8,height:8,data:new Uint8ClampedArray(8*8*4)};
  const glyph=new Uint8ClampedArray(8*8*4);
  const output=combineSelectiveLayers(clean,glyph);
  assert.equal(output.data.reduce((a,b)=>a+b,0),0);
  assert.equal(validateTransparentPatch(output,clean,glyph),true);
});
