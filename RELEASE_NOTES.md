# Türkçe PDF OCR (Chromium) v0.5.9 — Beta

**Tarih:** 23 Kasım 2026

v0.5.8 üzerinde çalışan OCR, WhatsApp ve tablo özellikleri korunarak Outlook e-posta görselleri ve OneDrive PDF bağlantıları için yeni yakalama yolları eklendi.

### Değişiklikler

- Sekmede doğrudan açılan JPEG, PNG, WebP, GIF ve BMP görselleri PDF gibi otomatik OCR ekranına yönlendirilebilir.
- Outlook'ta fotoğrafa veya OneDrive'da erişilebilir PDF bağlantısına sağ tıklayıp **PDF / görseli OCR ile aç** seçilebilir.
- Eklentinin **Bu sekmedeki belgeyi OCR ile aç** komutu OneDrive/Outlook sekmesini değiştirmeden dosya aktarımını dener.
- Kullanıcı tarafından seçilen ek, 32 MB sınırı, dosya imzası kontrolü, kaynak sekme/çerçeve yetkisi ve 10 dakikalık geçici depolamayla açılır.
- Giriş gerektiren ve farklı alan adlarında sunulan dosyalarda önce sayfa içi erişim, gerekli olduğunda eklenti kaynağından yeniden indirme denenir.
- Doğrudan PDF baytları yerine yalnızca HTML önizleme döndüren OneDrive/Outlook sayfalarında anlaşılır hata ve **İndir → PDF seç** yolu gösterilir.

### Kurulum

1. GitHub Release **Assets** bölümünden `Turkce-PDF-OCR-Chromium-v0.5.9.zip` dosyasını indirin.
2. Önceki kurulu `Eklenti` klasörünü yedekleyin. ZIP'teki `Eklenti` içeriğini aynı klasörün üzerine kopyalayın; `vendor` klasörünü koruyun.
3. `vivaldi://extensions` sayfasında eklentiyi **Yeniden yükle** ile yenileyin. WhatsApp Web açıksa F5 yapın.
4. Outlook veya OneDrive'da ekin kendisini açın ya da bağlantı/görsel üzerinde sağ tıklayın. Dosya aktarılmıyorsa **İndir → PDF seç** kullanın.

### Bilinen sınırlamalar

- OneDrive ve Outlook'un kimlik doğrulama gerektiren bazı **HTML önizleme sayfaları**, orijinal PDF/görsel baytlarını tarayıcıya erişilebilir URL olarak sunmaz. Bu durumda otomatik yakalama mümkün olmayabilir; dosyayı indirip elle seçmek gerekir.
- Canlı Outlook/OneDrive oturumlarıyla uçtan uca test yapılmadı; otomatik birim ve paketleme testleri ayrıdır.
- OCR sonuçları ve resmi belge verileri mutlaka aslıyla karşılaştırılmalıdır. Dijital imzalı PDF'yi yeniden üretmek imzayı geçersiz kılabilir.
- Mevcut WhatsApp iş akışındaki erişilemeyen Blob önizlemeleri için manuel dosya seçimi geçerlidir.
