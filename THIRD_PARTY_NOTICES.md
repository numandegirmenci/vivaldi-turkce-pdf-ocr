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
