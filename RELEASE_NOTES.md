# Türkçe PDF OCR (Chromium) v0.6.0 — Beta

**Tarih:** 23 Kasım 2026

### Yeni: Görsel üzerindeki yazıyı düzenleme

- PDF ve taranmış görseller üzerinde **Görünen yazıyı düzenle** düğmesi.
- OCR ile tanınmış sözcüğe tıklayıp yeni yazıyı girme; OCR tanımı başarısızsa fareyle alan çizip birden fazla kelime veya satır için metin yerleştirme.
- Yazı boyutu, yazı rengi ve kapatılacak alanın arka plan rengini ayarlama; görselin çevresinden yaklaşık arka plan rengi örnekleme.
- Değişikliklerin belge üzerinde önizlemesi; değişikliği kaldırma ve **Geri al**.
- **Düzenlenmiş PDF** ile orijinal dosyayı değiştirmeden, yeni adla çıktı alma. Değiştirilen taranmış OCR kelimeleri yeni PDF'nin görünmez metin katmanına eski haliyle eklenmez.
- Mevcut v0.5.9 Outlook, OneDrive, WhatsApp yakalama, OCR, tablo, metin seçimi ve aranabilir PDF özellikleri korunur.

### Kurulum

1. GitHub Release Assets altından **Turkce-PDF-OCR-Chromium-v0.6.0.zip** dosyasını indirin.
2. Mevcut eklenti klasörünün yedeğini alın ve yeni ZIP'in **Eklenti** klasör içeriğini eskisinin üzerine kopyalayın.
3. Vivaldi'de **vivaldi://extensions** adresinden **Yeniden yükle**; WhatsApp Web açıksa F5.

### Kullanım

1. PDF veya fotoğrafı OCR ile açın.
2. Üstte **Görünen yazıyı düzenle** düğmesine basın.
3. Yazıya tıklayın veya alan seçmek için fareyle sürükleyin.
4. Metni düzenleyin, renk/boyutu ayarlayın ve **Uygula** deyin.
5. **Düzenlenmiş PDF** ile sonucu kaydedin.

### Önemli sınırlamalar

- Bu özellik Adobe'nin görüntü onarma algoritmasının birebir kopyası değildir. Eski harfleri düz renkli bir alanla kapatıp yeni yazıyı yerleştirir. Desenli/fotoğraflı zeminler kusursuz onarılamaz.
- **Güvenli karartma/redaksiyon değildir.** Düzenlenmiş görünür PDF'de dijital PDF'nin eski metni veya nesneleri içerikte kalabilir. Hassas bilgileri silmek için kullanılmamalıdır.
- Döndürülmüş sayfalar görsel düzenleme için henüz desteklenmez.
- Görsel ve metin yerleşimi tahminidir; resmi evrakta sonuç özgün belgeyle mutlaka kontrol edilmelidir. PDF dijital imzaları yeni dosyada geçersiz olabilir.
- Canlı Vivaldi/Outlook/OneDrive oturumlarıyla uçtan uca test henüz yapılmamıştır. Otomatik testler gerçek uygulama testinin yerine geçmez.
