import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
process.chdir(here);
const dst = path.resolve('Eklenti/vendor');
fs.mkdirSync(path.join(dst,'core'),{recursive:true});
fs.mkdirSync(path.join(dst,'lang'),{recursive:true});
const copy=(from,to)=>{if(!fs.existsSync(from)) throw new Error('Eksik bağımlılık: '+from);fs.copyFileSync(from,path.join(dst,to));console.log('✓ '+to);};
copy('node_modules/pdfjs-dist/build/pdf.mjs','pdf.mjs');
copy('node_modules/pdfjs-dist/build/pdf.worker.mjs','pdf.worker.mjs');
copy('node_modules/tesseract.js/dist/tesseract.min.js','tesseract.min.js');
copy('node_modules/tesseract.js/dist/worker.min.js','worker.min.js');
copy('node_modules/pdf-lib/dist/pdf-lib.min.js','pdf-lib.min.js');
copy('node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js','fontkit.umd.min.js');
for(const name of fs.readdirSync('node_modules/tesseract.js-core')) {
 if(name.startsWith('tesseract-core') && (/\.wasm(\.js)?$/.test(name))) copy(path.join('node_modules/tesseract.js-core',name),'core/'+name);
}
const out=path.join(dst,'lang/tur.traineddata.gz');
if(!fs.existsSync(out)) {
  const u='https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/tur.traineddata';
  console.log('Türkçe en iyi kalite modeli indiriliyor (tek seferlik)...');
  const response=await fetch(u,{signal:AbortSignal.timeout(120000)});
  if(!response.ok) throw new Error(`Türkçe model indirme başarısız (HTTP ${response.status}). Şirket ağı GitHub erişimini engelliyor olabilir.`);
  const raw=Buffer.from(await response.arrayBuffer());
  if(raw.length<1000000) throw new Error('İndirilen Türkçe OCR modeli beklenenden küçük.');
  fs.writeFileSync(out,zlib.gzipSync(raw,{level:6}));
  console.log('✓ lang/tur.traineddata.gz ('+Math.round(fs.statSync(out).size/1024/1024)+' MB)');
}
// Aranabilir PDF dışa aktarmak için Türkçe karakter destekli açık lisanslı font.
const fontOut=path.join(dst,'NotoSans-Regular.ttf');
if (!fs.existsSync(fontOut)) {
  const fontUrl='https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
  console.log('Aranabilir PDF için Noto Sans fontu hazırlanıyor...');
  const fontResponse=await fetch(fontUrl,{signal:AbortSignal.timeout(120000)});
  if (!fontResponse.ok) throw new Error('Noto Sans indirilemedi (HTTP '+fontResponse.status+').');
  const binary=Buffer.from(await fontResponse.arrayBuffer());
  if(binary.length<100000)throw new Error('Font dosyası beklenenden küçük.');
  fs.writeFileSync(fontOut,binary);
  console.log('✓ NotoSans-Regular.ttf');
}
const fontLicense=path.join(dst,'Noto-OFL.txt');
if (!fs.existsSync(fontLicense)) {
  const licenseUrl='https://raw.githubusercontent.com/notofonts/noto-fonts/main/LICENSE';
  const licenseResponse=await fetch(licenseUrl,{signal:AbortSignal.timeout(120000)});
  if (!licenseResponse.ok) throw new Error('Noto Sans lisansı indirilemedi.');
  const licenseText=await licenseResponse.text();
  if (!licenseText.includes('SIL OPEN FONT LICENSE')) throw new Error('Noto Sans lisans metni doğrulanamadı.');
  fs.writeFileSync(fontLicense,licenseText);
  console.log('✓ Noto-OFL.txt');
}
console.log('\nHAZIR: Eklenti klasörünü tarayıcınızın uzantı sayfası > Geliştirici modu > Paketlenmemiş öğe yükle ile seç.');
