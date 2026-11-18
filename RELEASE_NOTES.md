# Türkçe PDF OCR (Chromium) v0.5.8 — Beta

**Tarih:** 18 Kasım 2026

Bu sürüm GitHub'daki v0.5.1 tabanını, yerel olarak denenmiş 0.5.2–0.5.8 geliştirmelerinin birleşik kaynak koduyla günceller.

### Yeni özellikler

- Sürekli fakat kullanıcı tarafından etkinleştirilen WhatsApp Web dosya yakalama; kapat-aç / farklı dosya / ilk dosyaya geri dönme akışları, beş öğelik geçici geçmiş, elle açık önizleme yakalama ve dosyadan seçme alternatifi.
- Tek tıklamada gereksiz OCR sekmeleri açılmasını önlemeye yönelik yakalama oturumu sınırları.
- DOCX, XLSX, PPTX, ODT, TXT/CSV/JSON/XML/HTML/RTF ve görseller için yerel belge açma.
- Sol PDF metni seçildiğinde sağda gerçek metin seçimi ve iki yönlü sayfa hizalama.
- Aynı PDF sayfasındaki başlıklı ücret tablosu ve farklı alan/değer kutularının ayrı ayrı tanınması.
- Tablo hücresi düzenleme, Excel'e TSV kopyalama, CSV indirme; sayısal hesap denetimi.
- Komşu satırların ayraç konumuyla OCR'nin `:` işaretini `1`, `3`, `I` olarak okumasına karşı ihtiyatlı temizlik.

### Kurulum

1. Release'in **Assets** bölümündeki `Turkce-PDF-OCR-Chromium-v0.5.8.zip` dosyasını kullanın (iş akışı tamamlandıktan sonra).
2. Mevcut `Eklenti` klasörünün yedeğini alın; ZIP'teki tüm `Eklenti` içeriğini **Ctrl+C / Ctrl+V** ile üzerine kopyalayın. `vendor` klasörünü silmeyin.
3. `vivaldi://extensions` → **Yeniden yükle**; WhatsApp Web → **F5**. CMD/PowerShell gerekmez.

### Geri dönüş

v0.5.7 test sürümü, ayraç düzeltmesi öncesindeki referanstır. Önceki kurulu eklentinizin yedeğini saklayın; `snapshots/v0.5.7/` yalnız ilgili tablo modülünün kaynak kodunu barındırır, tek başına tam uzantı değildir.

### Sınırlamalar

- Bu sürüm **Beta**'dır; gerçek Vivaldi ve canlı WhatsApp Web ile uçtan uca test tamamlanmadı.
- Tesseract.js 5 kullanılıyor; yeni OCR motoru entegre edilmedi.
- OCR ve tablo ayrıştırma sonucu özellikle resmi evrakın tarih, IBAN, sicil ve ödeme tutarlarında özgün belgeye göre doğrulanmalıdır.
- Bazı WhatsApp önizlemeleri erişilebilir Blob sağlamaz; elle dosya seçin.
- Dijital imzalı PDF'lerden yeni aranabilir PDF üretmek imzaları geçersiz kılabilir.
