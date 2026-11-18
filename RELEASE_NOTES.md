## Türkçe PDF OCR (Chromium) v0.5.1 — WhatsApp Web Hız ve Yeniden Açma Düzeltmesi (Beta)

Bu sürüm v0.5.0 üzerindeki gerçek kullanım geri bildirimleriyle hazırlandı.

### Düzeltmeler
- Kullanıcı 45 saniyelik PDF yakalamayı başlattığında normal PDF önizlemesi, sonradan açılan blob bağlantıları, bağlantıya normal tıklama ve üstteki **PDF düzenle** akışı için daha fazla yakalama yolu.
- WhatsApp'ın PDF bağlantısını açma/tıklama davranışı bekletilmez; önceki sürümün gecikmeye veya iki kez tıklamaya yol açabilen kancası değiştirildi.
- **↻ Son PDF** düğmesi: Başarıyla açılan PDF, yalnız WhatsApp Web sekmesinin belleğinde 5 dakika saklanır; OCR sekmesi kapatılsa bile tek tıkla yeniden açılabilir.
- İkinci PDF'yi yakalamak için normal **PDF OCR ile aç** düğmesine tekrar basılabilir.
- Tekrar yakalama, native bağlantı ve iptal durumları için testler.

### Güncelleme
Releases > Assets > `Turkce-PDF-OCR-Chromium-v0.5.1.zip` paketini indirip mevcut kurulumdaki aynı **Eklenti** klasörüne tüm dosyaları (vendor dahil) kopyalayın. Vivaldi `vivaldi://extensions` ekranında **Yeniden yükle** yapın ve WhatsApp Web sekmesini yenileyin.

### Beta sınırları
- WhatsApp PDF dosyasını Blob olarak sunmadığında veya önizleyici yöntemini değiştirdiğinde yakalama başarısız olabilir; PDF'yi indirip **PDF seç** ile açabilirsiniz.
- Gerçek WhatsApp Web uçtan uca tarayıcı testi yapılmalıdır.
- Aranabilir PDF'ye metin eklenmesi, orijinal dijital imzaları geçersiz kılabilir; asıl dosyayı saklayın.
