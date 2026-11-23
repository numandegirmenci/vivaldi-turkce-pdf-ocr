# Üçüncü taraf bileşenler

Bu depo kaynak kodunu içerir; `HAZIRLA.cmd` ile oluşturulan `Eklenti/vendor/` klasöründeki kütüphaneler kendi lisanslarına tabidir. Yayınlanan önceden oluşturulmuş ZIP'lerde ilgili lisansların korunması gerekir.

- [Mozilla PDF.js / pdfjs-dist](https://github.com/mozilla/pdf.js): Apache License 2.0.
- [Tesseract.js](https://github.com/naptha/tesseract.js): Apache License 2.0.
- [Tesseract.js Core](https://github.com/naptha/tesseract.js-core): ilgili depo lisansına bakın; dağıtım sırasında lisans metnini ekleyin.
- [Tesseract Türkçe tessdata_best](https://github.com/tesseract-ocr/tessdata_best): Apache License 2.0.

Önemli: Bu dosya üçüncü taraf lisans yükümlülüklerinin tamamlandığını garanti etmez. Chrome Web Store paketi dağıtılmadan önce her kullanılan bağımlılığın gerçek sürümüne ait lisansların dosyalara dahil edilmesi gerekir.


## Aranabilir PDF oluşturma (v0.4.0)
- pdf-lib 1.17.1 — MIT (Hopding/pdf-lib)
- @pdf-lib/fontkit 1.1.1 — MIT (Hopding/fontkit)
- Noto Sans Regular — SIL Open Font License 1.1 (Noto Project Authors, notofonts/noto-fonts). Font, kurulum paketinin vendor klasörüne yalnız PDF içinde Türkçe karakterleri korumak amacıyla eklenir. Telif/lisans şartları için resmi font deposuna bakın.

## Taranmış yazı benzetimi fontları (v0.6.2)
Aşağıdaki açık kaynak fontlar, taranmış yazının biçimini yerel ortamda yaklaşık eşleştirmek için indirilir. Yayın ZIP'inde ilgili font dosyalarıyla birlikte her birinin lisans metni bulunur.

- Roboto Condensed — SIL Open Font License 1.1 — `Eklenti/vendor/OCR-RobotoCondensed.ttf`, `RobotoCondensed-OFL.txt`.
- Oswald — SIL Open Font License 1.1 — `Eklenti/vendor/OCR-Oswald.ttf`, `Oswald-OFL.txt`.
- Anton — SIL Open Font License 1.1 — `Eklenti/vendor/OCR-Anton.ttf`, `Anton-OFL.txt`.
- Archivo Narrow — SIL Open Font License 1.1 — `Eklenti/vendor/OCR-ArchivoNarrow.ttf`, `ArchivoNarrow-OFL.txt`.

Kaynak: `google/fonts` deposu, `ofl/` alt dizinleri. Font ailesi ve görünüm eşleştirmesi bir tahmindir, görüntüden özgün fontun kesin kimliği kurtarılamaz.


## TrOCR handwriting and local inference (v0.6.7)

- `@huggingface/transformers` / Transformers.js — Apache 2.0 licensed browser inference runtime (bundled minified JavaScript plus matching ONNX WASM assets; see package metadata for exact version).
- `Xenova/trocr-small-handwritten` — MIT-licensed converted TrOCR ONNX model. We do **not** redistribute the large model weights in the extension ZIP. They are downloaded on the user's explicit opt-in and cached in their own browser; image pixels are processed locally. Upstream model card: https://huggingface.co/Xenova/trocr-small-handwritten
- TrOCR original architecture: Microsoft TrOCR small handwritten. It is English-centric; Turkish handwriting transcription is not assured. Users must review each suggestion.
