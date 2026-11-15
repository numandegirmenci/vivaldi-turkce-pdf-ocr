## Türkçe PDF OCR (Chromium) v0.3.1 — Beta

Bu sürümde ürün adı ve kurulum açıklamaları **Chromium tabanlı tarayıcılar** için güncellendi. PDF işleme/OCR algoritmasında yeni bir değişiklik yapılmadı.

### Önceki sürümden devam eden özellikler
- PDF'deki hazır seçilebilir metni korur; yalnız metinsiz sayfalara OCR uygular.
- **Bu sayfaya OCR** ve **PDF metni** seçenekleri ile sayfa bazlı düzeltme sunar.
- **Tam sayfa**, **Genişlik**, metin seçme/kopyalama seçenekleri bulunur.
- OCR tarayıcı içinde yerel çalışır.

### Tarayıcılar için önemli açıklama
Manifest V3 ve Chromium API'leri kullanılır. **Chrome, Edge ve Brave üzerinde uçtan uca test tamamlanmamıştır.** Bu tarayıcılarda otomatik PDF yönlendirme farklı davranabilir. Eklenti simgesindeki **PDF dosyası seç** seçeneğiyle deneyin ve sorunları bildirin.

### Kurulum (Node.js gerekmez)
1. Aşağıdaki `Turkce-PDF-OCR-Chromium-v0.3.1.zip` paketini indirip sabit bir klasöre çıkarın.
2. Tarayıcınızda `vivaldi://extensions`, `chrome://extensions`, `edge://extensions` veya `brave://extensions` adresini açın.
3. **Geliştirici modu**nu açıp **Paketlenmemiş öğe yükle** ile **Eklenti** klasörünü seçin.
4. Eklenti simgesinde **PDF dosyası seç** ile test edin.

**Güncelleme:** Mevcut kurulumdaki aynı **Eklenti** klasörünün içeriğini yeni ZIP ile (vendor dahil) değiştirin ve eklenti sayfasında **Yeniden yükle**ye basın. Yeni bir ikinci kopya yüklemeyin.

> GitHub ZIP paketi otomatik kurulmaz veya otomatik güncellenmez. Bu sürüm betadır; resmî belgelerde metin, sayı ve tarihleri asıl PDF ile doğrulayın.
