import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../Eklenti/whatsapp-content.js',import.meta.url),'utf8');
test('previous files cache includes up to five entries and can reopen chosen document',()=>{
 assert.match(src,/HISTORY_ITEMS\s*=\s*5/);
 assert.match(src,/recentFiles\.unshift/);assert.match(src,/recentFiles\.findIndex/);
 assert.match(src,/openCached\(file\)/);assert.match(src,/await transfer\(file\.bytes,file\.name/);
});
test('whatsapp capture requires explicit activation and supports cancel',()=>{
 assert.match(src,/type:'arm'|type:\s*'arm'/);
 assert.match(src,/type:'cancel'|type:\s*'cancel'/);
 assert.match(src,/captureVisible/);
});
