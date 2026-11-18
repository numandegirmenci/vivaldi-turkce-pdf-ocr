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

## v0.5.0 WhatsApp Web gerçek kullanım testleri
- [ ] Vivaldi normal sekmede WhatsApp Web oturumu aç, PDF OCR ile aç düğmesini gör.
- [ ] Yan panelde WhatsApp Web açıkken düğmenin olup olmadığını kontrol et; Vivaldi sürümüne göre farklı olabilir.
- [ ] PDF belgesine tıklamadan önce PDF OCR düğmesini etkinleştir; PDF yeni sekmeye ulaşsın.
- [ ] Geçersiz PDF, PDF olmayan blob ve 32 MB üstü dosya için hata ve orijinal WhatsApp davranışı kontrolü.
- [ ] Yakalamayı iptal et; daha sonraki PDF'lerin pasif olarak alınmadığını doğrula.
- [ ] Uzun PDF aktarımında bellek ve geçici parça temizliğini kontrol et.
- [ ] Önceden hazırlanmış seçilebilir PDF'lerde OCR katmanının bozulmadığını kontrol et.

## v0.5.1 — Kullanıcı kaynaklı yakalama sorunları
- [ ] Önce PDF OCR ile aç'a bas, sonra normal sohbet PDF belgesini aç. Mümkünse ilk denemede yakalanmalı.
- [ ] Normal önizlemede yakalanmayan PDF için PDF düzenle ile açmayı dene.
- [ ] Aynı PDF'yi OCR'de açıp OCR sekmesini kapat, WhatsApp'taki ↻ Son PDF ile tekrar aç.
- [ ] ↻ Son PDF üzerinden ardışık 3 tekrar açılışı test et.
- [ ] Farklı bir PDF için yeni PDF OCR ile aç akışını başlat; son PDF düğmesi yeni belgeyi açmalı.
- [ ] 45 saniyeyi aş, iptal et; izin kapanınca başka belge kendiliğinden alınmamalı.
- [ ] WhatsApp sekmesini yenile, eski PDF bellekte tutulmamalı.
- [ ] Normal PDF indir / aç tıklamaları engellenmemeli veya çoğalmamalı.

## v0.5.8 gerçek kullanım kontrolü
- [ ] Vivaldi WhatsApp Web'de yalnızca "Yakalamayı aç" düğmesine basıldığında **hiçbir OCR sekmesi açılmıyor**.
- [ ] PDF A aç → OCR sekmesini kapat → PDF B aç → kapat → tekrar A; en fazla bir OCR sekmesi açılıyor.
- [ ] Aynı anda birden çok WhatsApp Blob önizlemesi algılanırsa yanlış belge otomatik seçilmiyor.
- [ ] Aynı belgede ücret tablosu ve sağ üst alan/değer kutusu **iki farklı tablo** gösteriliyor.
- [ ] Ödeme/fatura belgesinde başlık içermeyen alan/değer grupları tanınıyor.
- [ ] ':' işareti 1/3 sanıldığında tablodan koşullu temizleniyor; gerçek numara başındaki 1 silinmiyor.
- [ ] Solda seçilen metin sağda gerçekten seçiliyor, Ctrl+C aynı karakterleri kopyalıyor.
- [ ] Tablo hücreleri düzeltildikten sonra Excel/CSV çıkışında düzeltmeler korunuyor.
- [ ] Kayıt ve belge mahremiyeti kontrol ediliyor; test PDF'leri kişisel veri içermiyor.
- [ ] Hazır ZIP'in GitHub Actions üzerinden oluşturulduğu ve 0.5.8 manifest/package eşleşmesi doğrulandı.
