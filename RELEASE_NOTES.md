# Türkçe PDF OCR v0.6.9 — Yazdırma, hızlı açılış ve tablo ayrımı (Beta)

**Tarih:** 27 Kasım 2026

- Ctrl+P, açık belgenin yazdırma işlevine yönlendirilir.
- Yazdırma sayfasında sıfır kenar boşluğu kullanılır; tarayıcı başlık ve altbilgilerinin görünmesi azaltılır.
- İlk sayfa öncelikli hazırlanır; görünür sayfaların OCR işlemleri sonraki sayfaların çizimini engellemez.
- Yeni çizgili tablo algılayıcısı gerçek yatay ve dikey çizgilerden hücreleri ayırır; çok satırlı ve boş hücreleri korur. Mevcut Excel için kopyalama ve CSV dışa aktarımı kullanılabilir.
- Çizgili tablo için sentetik regresyon testleri eklendi.

## Kurulum

Assets bölümünden `Turkce-PDF-OCR-Chromium-v0.6.9.zip` indirin. Kurulu Eklenti klasörünü yedekleyin, ZIP içindeki Eklenti içeriğini üzerine kopyalayın ve `vivaldi://extensions` sayfasında Yeniden yükle düğmesine basın. Kaynak kod ZIP'i kurulum paketi değildir.

## Bilinen sınırlar

- Gerçek Vivaldi/WhatsApp belgeleriyle manuel doğrulama tamamlanmamıştır. Tarayıcı ve yazıcı ayarları başlık/altbilgi davranışını etkileyebilir.
- Çizgisiz ve birleştirilmiş hücreli karmaşık tablolar tam algılanmayabilir.
- Serbest metin ekleme, gerçek PDF içerik düzenleme ve metin silme bu sürümde tamamlanmamıştır.
