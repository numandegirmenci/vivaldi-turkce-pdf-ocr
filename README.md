# Türkçe PDF OCR — Chromium tarayıcıları (v0.4.0 Beta)

Ücretsiz, açık kaynaklı, **yerel** PDF görüntüleyici ve Türkçe OCR eklentisi. Özellikle Vivaldi hedeflenir; Chrome, Edge ve Brave deneysel olarak desteklenir.

> **BETA:** Farklı Chromium sürümleri ve kurumsal PDF dosyaları üzerinde kapsamlı gerçek tarayıcı testleri tamamlanmadı. Önemli sayı, tarih, tablo ve resmî evrak verilerini orijinal PDF ile doğrulayın. OCR hataları olabilir.

## Hazır kurulum
**[Son GitHub Release](https://github.com/numandegirmenci/vivaldi-turkce-pdf-ocr/releases/latest)** üzerinden `Turkce-PDF-OCR-Chromium-v0.4.0.zip` dosyasını indirin. Kaynak kod ZIP'i yerine **Assets** bölümündeki hazır ZIP'i kullanın; üçüncü taraf bileşenleri ve Türkçe dil modelini içerir.

1. ZIP'i bilgisayarda **sabit bir klasöre** çıkarın.
2. Vivaldi'de `vivaldi://extensions` (Chrome: `chrome://extensions`, Edge: `edge://extensions`, Brave: `brave://extensions`) sayfasını açın.
3. **Geliştirici modu** → **Paketlenmemiş öğe yükle** → paket içindeki **Eklenti** klasörü.
4. Eklenti simgesinden **PDF dosyası seç** ya da doğrudan bir PDF bağlantısını açın.
5. Var olan eklentiyi yeniliyorsanız ikinci bir kopya kurmayın; aynı eklenti klasörünü güncelleyin.

## v0.4.0 — Tek sürümde gelen özellikler

- **Varsayılan Genişlik modu:** Açılan PDF görüntüleme alanına enlemesine sığar. İsterseniz **Tam sayfa** kullanabilirsiniz.
- **PDF'de arama:** Ctrl+F ile arama, F3 / Shift+F3 ile sonuç gezme, eşleşen sayfalarda sarı işaretler. Tarama PDF'lerinin tamamında aramak için **Tüm sayfalarda ara** düğmesini kullanın.
- **Yüksek sayfalı belgeler:** Sayfa kabukları önce gelir, görünür sayfalar gerektiğinde işlenir. Canvas sayısı sınırlanır. **Tüm metni hazırla** tüm sayfaları sıralı işleyerek kopyalama/arama için hazırlar.
- **OCR geliştirmesi:** PDF'de mevcut yazı varsa korunur; yalnız metinsiz sayfalar OCR edilir. İsteğe bağlı **Form/tablo için gelişmiş OCR** ile kontrast ve seyrek metin okuma modu denenebilir.
- **Sütunları koruyarak kopyala:** OCR sözcük kutularından satır, boşluk ve sekmeler oluşturulur; tablolarda yaklaşık sütun ayrımı yapılır. Orijinal yazı da seçilip Ctrl+C ile kopyalanabilir.
- **Klavye kısayolları:** Ctrl+F ara, F3/Shift+F3 sonraki/önceki, J/K sayfa, +/- yakınlaştır, 0 genişlik, 1 tam sayfa, Ctrl+S aranabilir PDF indir.
- **Sayfa gezgini:** Sayfa numarasına gitme ve sayfayı 90° döndürme.
- **Aranabilir PDF kaydı:** Taranmış sayfalara, Türkçe karakterleri destekleyen görünmez OCR metin katmanı ekleyerek yeni PDF dosyası oluşturur; mevcut PDF'nin görüntüsünü korur. Orijinal PDF üzerinde değişiklik yapmaz.
- **Kolay güncelleme yardımcısı (Windows):** ZIP'in yanındaki `KOLAY_GUNCELLE.cmd` mevcut Eklenti klasörünü yedekler, son resmi Release paketini indirip aynı klasöre kopyalar. **Ardından tarayıcının eklenti sayfasından Yeniden yükle yapılmalıdır.**

**Sınır:** Doğrudan GitHub ZIP ile kurulmuş paketlenmemiş uzantıyı Chrome/Vivaldi kendiliğinden otomatik güncellemez. Eklenti için gerçek tam otomatik güncelleme isteniyorsa bir uzantı mağazasında yayınlama ve mağazanın güncelleme kanalı gerekir.

## Kullanım ipuçları

- Tüm PDF metnini sağ panelden alacaksanız **Tüm metni hazırla** ile belgenin tamamını işleyin; çok sayfalı taramalar zaman alabilir.
- **Form/tablo için gelişmiş OCR** yalnız gerektiğinde deneyin. İyi OCR katmanlarını yeniden OCR etmeniz doğruluğu azaltabilir.
- **Aranabilir PDF** mevcut dijital imzaları geçersiz kılabilir; imzalı belgelerde orijinali saklayın.
- Şifreli PDF, bozuk PDF ve bazı giriş gerektiren bağlantılar açılamayabilir.
- Karmaşık tabloların hücre sırası ve OCR sözcük koordinatları her zaman tam doğru olmayabilir.
- Görüntüleyiciden dosya seçerek açma yereldir. Bağlantıyla açılan PDF'nin orijinal sunucusundan indirilmesi gerekebilir. OCR için harici sunucuya yüklenmez.

## Güncelleme

Sabit klasöre çıkardığınız pakette `KOLAY_GUNCELLE.cmd` dosyasını çalıştırıp eklentiyi güncelleyebilirsiniz. Windows güvenlik ilkeleri PowerShell çalıştırılmasını engelleyebilir. Böyle durumlarda yeni Release ZIP'indeki **Eklenti** klasörünün tüm içeriğini (vendor dahil) mevcut eklenti klasörünün üzerine kopyalayın ve Vivaldi'de `vivaldi://extensions` → **Yeniden yükle** yapın. ZIP içindeki eklenti klasörünü taşımayın veya silmeyin.

## Geliştiriciler

Node.js 22+ ile:

```bash
npm install
npm test
npm run build
npm test
```

`npm run build`, PDF.js, Tesseract, pdf-lib, fontkit, Türkçe OCR modeli ve OFL lisanslı Noto Sans dosyasını yerel `Eklenti/vendor` klasörüne kopyalar veya indirir. İndirme için GitHub erişimi gerekir. Hazır Release kullananların Node.js kurması gerekmez.

Otomatik testler metin düzenleme, varsayılan görünüm, bağlantı yönlendirme, yeni araçlar ve font/PDF entegrasyonunun bir bölümünü doğrular; **gerçek Vivaldi üzerinde uçtan uca doğrulama yerine geçmez.**

## Gizlilik ve lisans

Özgün kod MIT lisanslıdır. Üçüncü taraf bileşenler ve font için [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), gizlilik için [PRIVACY.md](PRIVACY.md) ve test listesi için [YAYIN_ONCESI_KONTROL.md](YAYIN_ONCESI_KONTROL.md) belgelerine bakın. Hata raporlarında kişisel veya kurumsal belge paylaşmayın.
