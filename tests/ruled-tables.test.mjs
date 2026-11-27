import test from 'node:test';
import assert from 'node:assert/strict';
import {extractRuledTables} from '../Eklenti/ruled-tables.mjs';

test('ruled grid preserves separate cells, multiline text and empty cells',()=>{
  const width=320,height=180,data=new Uint8ClampedArray(width*height*4).fill(255);
  const dot=(x,y)=>{const p=(y*width+x)*4;data[p]=data[p+1]=data[p+2]=0;};
  for(const y of [20,45,105,130])for(let x=20;x<=300;x++)dot(x,y);
  for(const x of [20,140,220,300])for(let y=20;y<=130;y++)dot(x,y);
  const e=(text,x,y,x1=x+20)=>({text,x,y,x1,h:10});
  const entries=[e('Açıklama',30,32,90),e('Miktar',155,32,195),e('Tutar',232,32,270),
    e('Depo',30,60),e('işlemleri',30,75,85),e('1',155,65),e('213,33',235,65,280)];
  const [table]=extractRuledTables({width,height,data},entries,1);
  assert.deepEqual(table.headers,['Açıklama','Miktar','Tutar']);
  assert.deepEqual(table.rows,[['Depo işlemleri','1','213,33'],['','','']]);
});
test('unruled words do not become a fabricated table',()=>{
  const width=320,height=180,data=new Uint8ClampedArray(width*height*4).fill(255);
  assert.deepEqual(extractRuledTables({width,height,data},[{text:'Örnek',x:20,x1:50,y:20,h:10}]),[]);
});
