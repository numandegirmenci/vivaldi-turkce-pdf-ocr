## Türkçe PDF OCR (Chromium) v0.5.0 — WhatsApp Web PDF Entegrasyonu (Beta)

### Yeni
- Vivaldi içerisinde `web.whatsapp.com` üzerinde **PDF OCR ile aç** düğmesi.
- Kullanıcı düğmeye basınca 45 saniyelik PDF yakalama penceresi açılır; PDF'ye tıklanınca veri tarayıcıdaki kendi görüntüleyicimize aktarılır.
- PDF verisi geçici ve parça parça aktarılır; 32 MB üstü dosyalar için WhatsApp'tan indirip "PDF seç" kullanılır.
- Sohbet içeriği, kişi listesi ve mesaj geçmişi okunmaz; otomatik arka plan PDF toplama yapılmaz.
- PDF açıldıktan sonra geçici parçalar eklenti deposundan silinir. On dakika sonunda eksik dosya parçaları temizlenir.

### Önceki özellikler
- Varsayılan Genişlik, PDF metin arama, sayfa döndürme, gelişmiş Türkçe OCR, tablo metni kopyalama, büyük PDF'lerde bellek optimizasyonu, aranabilir PDF olarak kaydetme, Windows güncelleme yardımcısı.

### Güncelleme
- Releases > Assets altındaki `Turkce-PDF-OCR-Chromium-v0.5.0.zip` dosyasını indirip **aynı Eklenti klasörüne** açın, Vivaldi `vivaldi://extensions` ekranında **Yeniden yükle** basın.
- WhatsApp Web sekmesini de yenileyin. Yan panelde düğme görünmezse WhatsApp'ı normal sekmede açın.

### Uyarı
- WhatsApp Web kendi PDF indirme yöntemini değiştirebilir. Bu özellik **Beta**dır; gerçek WhatsApp Web üzerinde uçtan uca test gereklidir.
- PDF kullanıcıya açık halde tarayıcı belleğinde üretilmiyorsa, otomatik yakalama çalışmayabilir. Fallback: WhatsApp PDF'yi indir → eklentide PDF seç.
- Gizli/kurumsal belgeleri GitHub'a hata örneği olarak yüklemeyin.
