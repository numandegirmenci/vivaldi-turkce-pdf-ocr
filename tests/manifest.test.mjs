import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('../Eklenti/manifest.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('Manifest V3 sürümü yayımlanan paketle eşleşir', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, pkg.version);
  assert.match(manifest.name, /Türkçe PDF OCR/);
});

test('Eklenti Chromium standart API izinleriyle yapılandırılmıştır', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'contextMenus', 'scripting', 'storage', 'tabs', 'webRequest'].sort());
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(manifest.action.default_popup, 'popup.html');
  for (const host of ['http://*/*', 'https://*/*', 'file:///*']) {
    assert.ok(manifest.host_permissions.includes(host), host);
  }
});

test('WhatsApp Web entegrasyonu dar kapsamlı alan adı ve kullanıcı etkileşimiyle sınırlı',()=>{
  assert.deepEqual(manifest.content_scripts.map(s=>s.matches),[
    ['https://web.whatsapp.com/*'],['https://web.whatsapp.com/*']
  ]);
  assert.equal(manifest.content_scripts[0].world,'MAIN');
  assert.equal(manifest.content_scripts[0].run_at,'document_start');
  assert.equal(manifest.content_scripts[1].run_at,'document_idle');
});
