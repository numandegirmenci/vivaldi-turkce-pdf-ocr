# Türkçe PDF OCR v0.6.7 — Akıllı Belge Analizi (Beta)

**Tarih:** 23 Kasım 2026

## Yeni: El yazısı, kaşe, imza ve basılı metni bölge bazında inceleme

- **🧠 Akıllı belge analizi:** Seçilen sayfada OCR satırları ve özgün görüntünün renkli/dairesel yapıları taranarak inceleme bölgeleri önerilir.
- **Bölge türleri:** Basılı metin, el yazısı, dairesel kaşe, imza/çizim ve belirsiz. Otomatik sınıflandırma *kesin tespit değil*, ekranda tahmin olarak gösterilir; kullanıcı bölge türünü değiştirebilir.
- **Fareyle bölge seç:** OCR'nin kaçırdığı mavi el yazısı veya kaşe alanını kullanıcı da işaretleyebilir.
- **Özgün / iyileştirilmiş görüntü:** Her bölge için özgün PDF'den yüksek çözünürlüklü kırpım alınır; sağ panelde orijinal ve yalnızca OCR için hazırlanan görüntü yan yana gösterilir. Kaynak belge görüntüsü değişmez.
- **Görüntü ön işleme:** Mavi kalem rengini öne çıkarma, pale filigran bastırma, kaşe kontrastı, siyah baskı kontrastı. Yalnız okuma amaçlıdır; belgenin kendisine uygulanmaz.
- **Kaşe OCR:** Yatay ve parçalı metin, ±15° döndürme ve isteğe bağlı *dairesel çevreyi şeride açma* denemeleri.
- **Çoklu OCR:** Bölge türüne göre Tesseract PSM 6/7/11/13 gibi uygun yöntemleri ardışık çalıştırır; belgenin ana OCR oturumunu bozmaz.
- **Güven analizi:** Adayların güven puanları ve metin benzerliği değerlendirilir. Uyuşmayan ya da düşük güvenli metin otomatik olarak doğru kabul edilmez; aday olarak gösterilir.
- **İmza:** İmza görseli metin gibi okunup tahmin edilmez; ayrı tür olarak korunur.
- **Doğrulanmış metin:** Kullanıcı bir adayı düzelterek ve onaylayarak sağdaki çıkarılan metne **ayrı bir doğrulama notu** ekleyebilir. Orijinal PDF değiştirilmez.

### Deneysel gerçek el yazısı modeli

- El yazısı bölgesinde **El yazısı modeli (deneysel)** düğmesiyle klasik Tesseract'tan **ayrı TrOCR small handwritten** modeli kullanılabilir.
- Modelin JavaScript/WASM çalışma bileşenleri ZIP içinde yerel olarak bulunur. **Büyük ONNX model ağırlıkları ilk kullanımda açık kullanıcı onayıyla internetten indirilir; sonrasında tarayıcı önbelleğinde saklanır.** Görüntü sunucuya gönderilmez; çıkarım cihazda gerçekleştirilir.
- Model İngilizce ağırlıklı eğitimlidir: **Türkçe el yazısındaki ğ, ı, İ, ş vb. karakterleri güvenilir biçimde tanıdığı iddia edilmez.** Ürettiği metin yalnızca kullanıcı tarafından doğrulanacak adaydır.
- Model indirilemezse veya cihaz yetersizse çoklu Tesseract bölge incelemesi çalışmaya devam eder.

### Kurulum

1. GitHub Releases'ten `Turkce-PDF-OCR-Chromium-v0.6.7.zip` indirin.
2. Kurulu `Eklenti` klasörünü yedekleyin ve ZIP içindeki `Eklenti` klasörünü öncekinin yerine kopyalayın.
3. Vivaldi `vivaldi://extensions` sayfasından **Yeniden yükle**.
4. Orijinal PDF/fotoğrafı açın, sağ üstteki **🧠 Akıllı belge analizi** düğmesine tıklayın, otomatik önerilen bölgeyi seçin veya **Fareyle alan seç** kullanın.
5. Bölge türünü doğrulayın; **Bölgeyi çoklu OCR ile oku** deyin. Orijinal ve işlenmiş görüntüyü, okuma alternatiflerini ve belirsizlik uyarılarını inceleyin. Doğru metni onaylayıp not olarak ekleyebilirsiniz.

### Sınırlar

- Bölge ayrımı ve dairesel kaşe çözümü deneysel görüntü işleme kurallarıdır; kompleks, üst üste gelen kaşe-imza metinleri veya silik Türkçe el yazısı her zaman okunamayabilir.
- Otomatik analiz düşük güvenli sonuçları boş bırakabilir, bu bir hata değil yanlış bilgi uydurmamaya yönelik kuraldır.
- Model dosyalarının ilk indirilmesi internet ve cihaz belleği gerektirir. Model performansı ve Türkçe harf doğruluğu cihazdan cihaza farklıdır.
- Bu çalışma OCR/bölge okuma iyileştirmesidir; önceki görsel yazı düzenleme özelliğinin tüm taramalarda kusursuz onarım garantisi yoktur. Orijinal PDF saklanmalıdır; bu güvenli redaksiyon değildir.
- Otomatik Chromium sentetik görüntü testleri, kullanıcının elindeki taranmış belgede gerçek dünya performansını kesinleştirmez.
