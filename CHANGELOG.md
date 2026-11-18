# Değişiklik geçmişi

## v0.5.8 — 18 Kasım 2026
- Taranmış alan/değer kutularında ':' işaretinin 1, 3, I veya | olarak algılanması ihtimaline karşı **birden çok satırda aynı x koordinatındaki ayraç kanıtıyla** hücre temizleme.
- Belirsiz durumlarda rakam silme yapılmaz. Orijinal OCR metni değiştirilmez.
- Yeni OCR motoru eklenmedi; halen Tesseract.js 5 kullanılır.
- v0.5.7, geri dönüş sürümü olarak korunur.

## v0.5.7
- Aynı sayfada birden fazla tablo: başlıklı ücret tablosu ve ayrıca tarih, tahakkuk numarası, talep numarası gibi alan/değer kutuları.
- Banka/ödeme bilgilerindeki başlıksız grupları tanıma.
- Tablo başına kopyalama; Excel/CSV; ücret tablolarında hesap kontrolü.

## v0.5.6
- WhatsApp yakalamayı açınca gereksiz OCR sekmeleri oluşmasını sınırlama; tek etkileşim için bir aktarım.
- Otomatik algılanmazsa açık PDF önizlemesini kullanıcı isteğiyle yakalama.
- Tablo tutarlarını temizleme, birim fiyat × adet denetimi, hücreyi elle düzenleme.

## v0.5.5
- Soldan seçilen metnin sağ textarea içinde **gerçek seçime** dönüşmesi; OCR metni farklıysa birebir seçimi ayrıca gösterme.
- Koordinat bazlı sütun/hücre ayrıştırma ve tablo kopyalama.
- WhatsApp geçici dosya geçmişi: en çok 5 dosya, toplam 64 MB.

## v0.5.4
- Yakalama açıkken arka arkaya farklı belgeleri açma ve ilk belgeyi yeniden açma.
- PDF, görseller, DOCX/XLSX/PPTX/ODT ve çeşitli metin türlerini yerel açma.
- OCR PSM 3/6 karşılaştırma ve gerektiğinde kontrast; iki yönlü sayfa hizalama.

## v0.5.3
- Sol PDF seçiminin sağda vurgulanması ve seçili metin kopyalama.
- OCR sonuçlarını karşılaştırma ve güvenli katman oluşturma.

## v0.5.2
- Belge biçimleri ve görseller için yerel PDF'ye dönüştürme.
- Tesseract kelime koordinatlarını PDF yüzeyine ölçekleme.

## v0.5.1
- Kullanıcı başlatmalı WhatsApp Web PDF aktarımı.

## Bilinen sınırlar
- Gerçek Vivaldi / WhatsApp Web uçtan uca testlerinin tamamlandığı iddia edilmez.
- Her WhatsApp önizlemesi erişilebilir Blob üretmeyebilir; manuel dosya seçme seçeneği vardır.
- OCR çizgileri/hatalı sayıları tamamen ayırt edemez; ödeme ve kimlik bilgilerinin aslıyla karşılaştırılması gerekir.
