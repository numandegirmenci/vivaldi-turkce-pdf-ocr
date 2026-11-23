import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateTextStyle,sampleCanvasTextStyle} from '../Eklenti/text-style.mjs';

function image(width,height,bg,ink,rect){
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const on=x>=rect.x0&&x<rect.x1&&y>=rect.y0&&y<rect.y1&&
      ((x-rect.x0)%4<2) && y>=rect.y0+3 && y<rect.y1-3;
    const color=on?ink:bg,offset=(y*width+x)*4;
    data.set([...color,255],offset);
  }
  return {width,height,data};
}
test('beyaz belgede siyah yazı ve beyaz zemin otomatik örneklenir',()=>{
  const rect={x0:12,y0:10,x1:64,y1:31};
  const result=estimateTextStyle(image(90,50,[255,255,255],[18,24,29],rect),rect,'BELGE');
  assert.equal(result.fill,'#ffffff');
  assert.equal(result.ink,'#12181d');
  assert.ok(result.confidence>.50);
});
test('koyu zemin üzerindeki açık renk yazı, siyah yazı varsayılmadan tanınır',()=>{
  const rect={x0:10,y0:10,x1:70,y1:35};
  const result=estimateTextStyle(image(90,50,[20,45,70],[253,216,112],rect),rect,'BÜYÜK');
  assert.equal(result.fill,'#142d46');
  assert.equal(result.ink,'#fdd870');
  assert.ok(result.confidence>.5);
});
test('mavi yazılı açık renk kağıt algılanır',()=>{
  const rect={x0:18,y0:14,x1:66,y1:35};
  const bitmap=image(100,50,[238,231,218],[24,81,166],rect);
  const canvas={width:100,height:50,getContext:()=>({getImageData:(x,y,w,h)=>{
    const pixels=new Uint8ClampedArray(w*h*4);
    for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)
      for(let c=0;c<4;c++)pixels[(dy*w+dx)*4+c]=bitmap.data[((y+dy)*100+x+dx)*4+c];
    return {data:pixels,width:w,height:h};
  }})};
  const result=sampleCanvasTextStyle(canvas,rect,'İZMİT');
  assert.equal(result.ink,'#1851a6');
  assert.equal(result.fill,'#eee7da');
});
test('bozuk resim verisi reddedilir',()=>{
  assert.throws(()=>estimateTextStyle({width:10,height:10,data:new Uint8Array(4)},
    {x0:1,y0:1,x1:6,y1:7}),/görüntüsü okunamadı/);
});
