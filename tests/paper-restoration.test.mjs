import test from 'node:test';
import assert from 'node:assert/strict';
import {planPaperRestoration,compositeCleanup} from '../Eklenti/paper-restoration.mjs';

function print(w=180,h=60,{paper=247,ink=28}={}){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4;
  const grain=((x*11+y*3)%7)-3;
  const glyph=x>=15&&x<=w-16&&y>=12&&y<=h-13&&(x%14<6);
  const antialias=x>=15&&x<=w-16&&y>=11&&y<=h-12&&(x%14===6||x%14===13);
  const value=glyph?ink:antialias?179:paper+grain;
  data[k]=data[k+1]=data[k+2]=value;data[k+3]=255;
 }
 return {width:w,height:h,data};
}
test('eski yazının tamamı ve antialias/JPEG gölgesi temizlenir',()=>{
 const source=print();
 const repair=planPaperRestoration(source,{ink:'#1c1c1c',fill:'#f7f7f7'});
 const restored=compositeCleanup(source,repair);
 let residual=0;
 for(let y=8;y<source.height-8;y++)for(let x=8;x<source.width-8;x++){
  const k=(y*source.width+x)*4;
  if(restored.data[k]<225)residual++;
 }
 assert.equal(residual,0,'old faint letter outlines must not remain after paper repair');
 assert.equal(restored.data[(24*source.width+30)*4+3],255);
 assert.ok(repair.oldGlyphPixels>150);
 assert.equal(repair.method,'bounded-paper-restoration');
});
test('onarılan alanın dışında kaynak pikseller hiç değişmez; kenarlar yumuşakça kapanır',()=>{
 const source=print(),repair=planPaperRestoration(source,{ink:'#1c1c1c',fill:'#f7f7f7'});
 assert.equal(repair.data[3],0,'patch boundary must remain transparent');
 const restored=compositeCleanup(source,repair);
 // Image crop corner is a genuinely unmodified pixel.
 assert.equal(restored.data[0],source.data[0]);
 assert.equal(restored.data[1],source.data[1]);
});
test('kenara taşan yazı kapatılıp komşu harfler silinmez',()=>{
 const source=print();
 for(let y=7;y<source.height-7;y++){
  const k=(y*source.width)*4;
  source.data[k]=source.data[k+1]=source.data[k+2]=15;
 }
 assert.throws(()=>planPaperRestoration(source,{ink:'#1c1c1c',fill:'#f7f7f7'}),
   /kenarında eski harf|desenli/);
});
test('desenli/filigran zemin düz beyaza boyanmaz; işlem reddedilir',()=>{
 const source=print();
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
  if((x+y)%3===0){
   const k=(y*source.width+x)*4;
   source.data[k]=178;source.data[k+1]=230;source.data[k+2]=145;
  }
 }
 assert.throws(()=>planPaperRestoration(source),/desenli|değişken|temiz/);
});
test('boş alana yanlışlıkla tıklayınca beyaz kağıt silinmez',()=>{
 const source=print();
 for(let k=0;k<source.data.length;k+=4)
  source.data[k]=source.data[k+1]=source.data[k+2]=251;
 assert.throws(()=>planPaperRestoration(source),/Eski yazı/);
});
