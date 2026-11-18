# Türkçe PDF OCR v0.5.8 (Beta)

**18 Kasım 2026**

GitHub v0.5.1 tabanı üzerine yerel 0.5.2–0.5.8 geliştirmeleri birleştirilmiştir.

### Öne çıkanlar
- WhatsApp'ta kullanıcı tarafından başlatılan sürekli yakalama, son dosyalardan yeniden açma ve yanlış tetiklenen çoklu sekmelere karşı kontroller.
- PDF, görüntü ve desteklenen ofis/metin belgelerini açma.
- Sol PDF seçiminde sağda Ctrl+C yapılabilir gerçek metin seçimi ve çift yönlü hizalama.
- Çoklu tablo ve alan–değer grubu algılama; düzenlenebilir hücre, TSV/Excel kopyalama ve CSV indirme.
- Özellikle ': → 1 / 3' hatasında birden fazla satırdaki ayraç konumlarını dikkate alan sınırlı temizleme.

### CMD kullanmadan güncelleme
Releases → Assets altındaki hazır v0.5.8 ZIP'ini açın; **mevcut Eklenti klasörünün yedeğini alın**, yeni dosyaları ve `vendor` klasörünü aynı etkin klasöre yapıştırın. Vivaldi'de `vivaldi://extensions` → Yeniden yükle, WhatsApp Web'de F5.

### Geri dönüş
v0.5.7 yerel eklenti klasörünün tam yedeğini saklayın. İlgili eski tablo modülleri `snapshots/v0.5.7` altında ayrıca tutulur.

### Beta uyarısı
Gerçek Vivaldi ve canlı WhatsApp Web uçtan uca testleri tamamlanmadı. PaddleOCR entegre değil; Tesseract.js 5 kullanılır. Kritik rakamları orijinal belgeyle doğrulayın. Bazı WhatsApp belgeleri otomatik yakalanmayabilir. Yeni aranabilir PDF, eski dijital imzayı geçersiz kılabilir.
