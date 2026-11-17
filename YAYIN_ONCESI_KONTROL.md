# Yayın öncesi kontrol

Aşağıdaki maddeler tamamlanana kadar Chrome, Edge veya Brave için **doğrulanmış uyumluluk** iddiasında bulunmayın.

- [ ] Vivaldi: seçilebilir metinli PDF, taranmış Türkçe PDF ve karma PDF gerçek tarayıcıda açıldı.
- [ ] Google Chrome: aynı 3 PDF ile açma, OCR, metin seçme/kopyalama ve sekme yönlendirmesi doğrulandı.
- [ ] Microsoft Edge: aynı 3 PDF ile açma, OCR, metin seçme/kopyalama ve sekme yönlendirmesi doğrulandı.
- [ ] Brave: destek sözü verilecekse aynı kontroller tamamlandı.
- [ ] Her tarayıcıda otomatik PDF açma kapatılıp tekrar denendi; gerekirse “PDF dosyası seç” çalışıyor.


- [ ] En az 3 taranmış, kişisel bilgi içermeyen PDF ile test yapıldı.
- [ ] Türkçe karakterler ve OCR seçim pozisyonu doğrulandı.
- [ ] WhatsApp Web, Google Drive, Vivaldi başlangıç sayfasında PDF olmayan içerikler PDF olarak açılmıyor.
- [ ] Giriş gerektiren PDF'lerde hata mesajı kullanıcıya yardımcı oluyor.
- [ ] Otomatik yönlendirme kapatıldığında duruyor.
- [ ] Chrome Web Store için yalnızca `Eklenti` klasöründeki gerekli dosyalar dahil edildi.
- [ ] Manifest izinleri gözden geçirildi, gerekçeleri yazıldı.
- [ ] Eklentinin veri işleme beyanı ve gizlilik politikası güncel ve doğru.
- [ ] Üçüncü taraf lisans metinleri ve bildirimleri dağıtım paketine eklendi.
- [ ] Mağaza adı, simgesi, açıklaması, ekran görüntüleri ve destek adresi hazır.
- [ ] Store incelemesinde onay garantisi olmadığı belirtildi.

## v0.4.0 için ek gerçek tarayıcı testleri (yayından önce)
- [ ] Vivaldi'de 1 sayfa ve 100+ sayfa PDF yükle; ilk görüntü **Genişlik** modunda olsun.
- [ ] 100+ sayfa belgedeki uzak sayfaya git ve geri dön; boş görüntü olmamalı.
- [ ] Ctrl+F / F3 / Shift+F3 araması ve sarı vurguları normal, taranmış PDF üzerinde dene.
- [ ] Gelişmiş OCR'yi formlarda dene ve düz OCR ile sonuçları karşılaştır.
- [ ] Tablo içindeki hücre aralıklarını **Sütunları koruyarak kopyala** ile kontrol et.
- [ ] 90 derece döndürüp yazıyı seçme ve başka sayfaya geçmeyi kontrol et.
- [ ] Türkçe karakter içeren taranmış PDF'yi **Aranabilir PDF** olarak kaydet, aç, içinde Ctrl+F ile arama yap.
- [ ] OCR katmanlı eski PDF'de metnin yeniden OCR ile bozulmadığını kontrol et.
- [ ] Windows KOLAY_GUNCELLE.cmd yedek ve dosya kopyalama işlemini gerçek kurulumda dene.
- [ ] Dijital imzalı PDF'de orijinal dosyanın hiç değişmediğini kontrol et.
