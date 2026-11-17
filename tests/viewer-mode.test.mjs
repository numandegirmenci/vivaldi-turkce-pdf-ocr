import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../Eklenti/viewer.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../Eklenti/viewer.html', import.meta.url), 'utf8');

test('Yeni PDF ve ilk açılış genişliğe sığdırma modunda başlar', () => {
  assert.match(js, /viewMode:\s*'width',\s*zoom:\s*1/);
  assert.match(js, /state\.zoom\s*=\s*1;\s*state\.viewMode\s*=\s*'width';/);
  assert.match(html, /id="zoomLabel">Genişliğe sığdır<\/span>/);
  assert.match(html, /id="fitWidth"[^>]*aria-pressed="true"/);
});

test('Tam sayfa düğmesi manuel olarak kullanılmaya devam eder', () => {
  assert.match(js, /\$\('fit'\)\.onclick\s*=\s*\(\)\s*=>\s*\{\s*state\.viewMode='page';/);
  assert.match(js, /\$\('fitWidth'\)\.onclick\s*=\s*\(\)\s*=>\s*\{\s*state\.viewMode='width';/);
});
