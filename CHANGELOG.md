# Değişiklik geçmişi

## v0.6.9 — 27 Kasım 2026
- Ctrl+P belgeye özel yazdırmayı çağırır; sıfır yazdırma kenar boşluğu.
- İlk sayfa öncelikli çizim ve arka planda metin/OCR işleme.
- Gerçek çizgilerden tablo hücreleri çıkarma ve regresyon testleri.
- Vivaldi manuel testi ve serbest metin düzenleme henüz tamamlanmadı.

## v0.6.8
- Doldurulabilir AcroForm PDF alanları görüntüleyicide açılır ve doldurulmuş PDF kopyası kaydedilebilir.
- Belgeyi yazdır düğmesi yalnızca sayfaları hazırlar.
- WhatsApp yakalama komutları tarayıcıdaki PDF OCR menüsüne taşındı.

## v0.6.7 — 23 Kasım 2026 · Akıllı Bölge Analizi (Beta)

- PDF'de bölge önerileri: basılı yazı, mavi kalem el yazısı, dairesel kaşe, imza ve belirsiz görüntü alanları.
- Orijinalden yüksek çözünürlüklü bölge kesme; OCR ön işlemi ile özgün görüntüyü yan yana gösterme ve elle alan seçimi.
- El yazısı, kaşe ve basılı metin için bölgeye özgü birden fazla Tesseract PSM okuma adayı, filigran azaltma ve dairesel kaşe şerit açılımı.
- Düşük güvenli/uyuşmayan OCR sonuçlarında metin uydurmama; kullanıcı doğrulamalı metin notları.
- İsteğe bağlı, ilk kullanımda indirilen ONNX TrOCR small handwritten modeli: yerel cihazda çıkarım, Türkçe doğruluğu garanti edilmez.
- OCR ve el yazısı analizinde orijinal belge görüntüsü korunur.


## v0.6.6 — 23 Kasım 2026 · Eski yazı izi temizliği ve Türkçe OCR güven puanı

- Antialias ve JPEG gölgelerini eksik silen eski seçici maske yerine, yalnızca doğrulanmış temiz kağıt üzerinde tüm yazı alanını örnekleme ve kenar yumuşatma ile onarma.
- Harf kalıntısı temizleme, seçim dışı piksel koruma, kenar/filigran reddi ve gerçek Chromium görsel testi.
- Tesseract tessdata_best/tur modelini koruyarak otomatik PSM 3 / 6 / 11 ve kontrastlı alternatif okuma stratejisi.
- OCR sonucu değerlendirmesinde sözcük güven puanı, sahte uzun okuma cezaları ve satır düzeni puanı.
- Önceki v0.6.5 görsel düzenleme güvenlik kuralları ve karşılaştırma korunur.


## v0.6.5 — 23 Kasım 2026 · Görsel yazı Uygula düğmesi ve hata görünürlüğü (Beta)

- Uygula reddedilirse nedenini yukarıdaki görünmeyen durum satırı yerine doğrudan sağ düzenleme panelinde gösterme.
- Dar OCR kelime kutularını, komşu kelimelere dokunmadan otomatik boşluk alanına doğru genişletme.
- Kutu genişletildiğinde yeni fontun orijinal harf boyutunu koruma; “AVCILAR → AKCIKAR” regresyon testi.
- Başarılı değişiklikte yanlışlıkla açık kalan orijinal karşılaştırma modunu kapatıp sonucu görünür kılma.
- Şeffaf piksel tabanlı v0.6.4 korumaları ve orijinal PDF'ye dokunmadan dışa aktarma devam eder.


## v0.6.4 — 23 Kasım 2026 · Tarama üzerinde saydam, piksel seçici metin düzeltme (Beta)

- Opak bir dikdörtgenle tüm OCR alanını kapama yaklaşımı kaldırıldı: yalnız maskelenebilen eski harf pikselleri ve yeni yazı pikselleri içeren saydam PNG onarım katmanı.
- Kullanılmayan görüntü piksellerinin sıfır alfa kalmasını denetleyen RGBA testleri.
- Düşük kontrast, desenli zemin, seçili alan kenarındaki harf, kesilen yeni yazı ve komşu OCR yazı korumaları.
- Tek sözcük OCR kutularına küçük güvenlik payı; kullanıcıya orijinal/düzenlenmiş görüntü arasında karşılaştırma düğmesi.
- PDF dışa aktarımında opak dikdörtgen yedek yolunu kaldırma; kaynak PDF görüntüsünün korunması.
- Tam Adobe Scan kalitesi garanti edilmez; başarısız yazı bölgesi, orijinal sayfa korunarak reddedilir.


## v0.6.3 — 23 Kasım 2026 · Görsel OCR düzeltmede taşma ve vurgu hatalarını önleme (Beta)

- Yanlış daraltma sonucu “AVCILAR” gibi başlıkların aşırı uzun/dar görünmesine yol açan yatay ölçekler engellendi.
- OCR kelimeleri arasındaki kısmi alan örtüşmelerinde komşu yazıyı kapatmak yerine açık hata gösterme.
- Kağıt rengini, yakındaki örnek yazı yerine doğrudan değiştirilen metnin kendi konumundan alma.
- Arama sonuçlarının sarı vurgusunu düzenleme modunda kaldırma; bunun renk örneklemesi ve kullanıcı önizlemesiyle karışmasını önleme.
- OCR kelime kutusu kısa geldiğinde Shift+fare sürüklemesiyle bilinçli ve daha geniş seçim imkanı.
- Tarayıcıda görsel kalite birebir doğrulanmış değildir; otomatik testler regresyon kontrolleri içindir.


## v0.6.2 — 23 Kasım 2026 · Taranan belgedeki yazı stilini aynı satırdan örnekleme (Beta)

- “BELEDİYE / BAŞKANLIĞI” testindeki gibi sonradan eklenmiş görünen, kısa/ince yazı problemini ele alma.
- Aynı satırdaki özgün kelimeyi örnekleyip OCR piksel şekliyle beş font ailesini eşleştirme; harf yüksekliğini koruyarak yatay sığdırma.
- Önizleme ve PDF çıktısında aynı raster yazı yamasını kullanma; taranmış kağıt tonunu ve gürültüsünü koruyan arka plan tahmini.
- Önizlemede sürekli kesikli mavi çerçeveyi kaldırma; aşırı uzun yazılarda uyarı.
- Açık lisanslı yerel fontları ve lisans metinlerini kurulum paketine dahil etme.
- Font eşleştirme yaklaşık sonuçtur; arka plan dokusu tam onarılmaz, resmi PDF'lerde kaynak belgenin aslı saklanmalıdır.


## v0.6.1 — 23 Kasım 2026 · Yazının özgün renk ve kalınlığına otomatik uyarlama (Beta)

- Önceden elle girilen yazı rengi, arka plan rengi ve boyut seçenekleri kaldırıldı: belge üzerindeki özgün harf/zemin piksellerinden otomatik örnekleme.
- Açık ve koyu zemindeki renkli yazılar için testli renk tahmini, yaklaşık kalınlık algılama ve PDF'ye Noto Sans Bold ekleme.
- Kullanıcı yalnızca yeni metni yazar; örnekleme güvenilir değilse renk tahmininin belirsiz olduğu gösterilir.
- Font ailesi birebir algılanamaz; dokulu arka planı düz renk kapama bütünüyle onaramaz. Güvenli redaksiyon değildir.


## v0.6.0 — 23 Kasım 2026 · Görselde görünen yazıyı düzenleme (Beta)

- Tanınan OCR sözcüğüne tıklayarak veya alan seçerek görsel PDF metnini değiştirme; yazı rengi, boyut ve zemin rengi.
- Yerinde önizleme, değişikliği kaldırma ve geri al; orijinal dosyayı bozmadan `-duzenlenmis.pdf` dışa aktarma.
- Düzenlenen taranmış OCR kelimelerinin görünmez eski metin olarak PDF'ye yeniden eklenmesini engelleme.
- Önemli: görünür düz renk yamadır; desenli zemini otomatik tamamlamaz, güvenli redaksiyon değildir, döndürülmüş sayfa desteği yoktur.

## v0.5.9 — 23 Kasım 2026 · OneDrive PDF ve Outlook görsel ekleri (Beta)

- Doğrudan açılan PDF ve yaygın fotoğraf türlerini OCR ile yakalama.
- Outlook görselleri ve OneDrive bağlantıları için sağ tıkla OCR ile aç; yalnız kullanıcı isteğiyle, sekme/çerçeve kontrollü geçici aktarım.
- Farklı alan adındaki gerçek dosyaya eklenti kaynağından erişim denemesi.
- HTML önizleme sayfalarında yanıltıcı PDF yerine indirme ve dosya seçme yönlendirmesi; WhatsApp aktarımı korunur.

## v0.5.8 — 18 Kasım 2026 · OCR ayraç yanlış okuma düzeltmesi (Beta)

- `:` karakterinin `1`, `3`, `I`, `|` olarak okunması halinde aynı sütunda en az iki farklı alanın ayraç kanıtına dayanan temizlik.
- Orijinal OCR metni korunur; yalnız yapılandırılmış alan/değer hücresinde ihtiyatlı düzeltme yapılır.
- Belirsiz gerçek rakamlar otomatik silinmez. Mevcut v0.5.7 modülü `snapshots/v0.5.7/` altında geri dönüş amacıyla saklanır.
- OCR motoru hâlâ Tesseract.js 5; PaddleOCR veya başka motor kurulmadı.

## v0.5.7 — Çoklu tablo ve alan/değer kutuları

- Aynı sayfada farklı kutuların ayrı tablolar olarak çıkarılması; ücrete ilişkin başlıklı tablolar ve tarih, tahakkuk no, talep no, birim, fatura no/tutar/IBAN gibi alan/değer kutuları.
- Her grup için bağımsız kopyalama, tüm tablolar için TSV/CSV; düzenlenen hücreler çıktıya yansır.
- Hesap denetimi yalnız gerçekten ücret tablosu olduğu anlaşılan gruplara uygulanır.

## v0.5.6 — WhatsApp çoklu sekme ve sayısal tablo denetimi

- Yakalamayı açmak tek başına OCR sekmesi oluşturmamalı; tek etkileşim tek aktarım; normal tıklamaların yanlış pozitif oluşturmasını sınırlama.
- Açık PDF önizlemesini elle yakalama yolu; otomatik yakalama için sınırlamalar.
- Birim fiyat × adet ve tutar uyuşmazlıklarını görünür uyarıyla gösterme; yanlış okunan hücreleri elle düzeltme.

## v0.5.5 — Gerçek sağ panel seçimi, tablo ayrıştırma

- Sol PDF'deki seçimin sağ panelde gerçek seçime dönüşmesi; OCR farkında seçilen orijinal metni ayrıca gösterme.
- Koordinat tabanlı sütun ve satır çıkarma; hücreleri ayrı seçme; Excel/CSV.
- WhatsApp dosya geçmişi: son 5 dosya / toplam 64 MB'a kadar sekme belleğinde yeniden açma.

## v0.5.4 — Sürekli WhatsApp yakalama ve daha geniş belge türleri

- İsteğe bağlı yakalama açıkken birden fazla belgeyi ardışık açma; aynı belgeyi yeniden yakalama, açıkça kapatma.
- DOCX/XLSX/PPTX/ODT ve çeşitli metin/görsel türlerini PDF'ye dönüştürerek açma.
- Zayıf OCR'de alternatif sayfa segmentleme ve isteğe bağlı kontrast denemeleri.
- PDF ile sağ metin panelinde iki yönlü sayfa/hizalama.

## v0.5.3 — Seçim görünürlüğü ve OCR sonucu seçimi

- Solda seçilen metnin sağdaki ayrı görünümde vurgulanması; seçilen metnin panoya alınması.
- OCR okumalarında kelime konumlarını koruma, PSM 3 ve gerektiğinde PSM 6 sonucu karşılaştırması.

## v0.5.2 — Giriş biçimleri ve OCR katman iyileştirmesi

- Görseller ve düzenlenebilir belge türleri için yerel dönüştürme, OCR koordinat ölçekleme.
- WhatsApp ile PDF dışı belge aktarımını başlatan altyapı.

## v0.5.1 — Temel WhatsApp PDF yakalama

- Kullanıcı başlatmalı PDF yakalama, kısa süreli tekrar açma ve yerel geçici aktarım.

## Bilinen sınırlamalar

- Canlı Vivaldi ve WhatsApp Web uçtan uca testleri tamamlanmadı; bazı WhatsApp önizlemeleri hiçbir erişilebilir Blob sunmayabilir.
- Tesseract, tablo çizgisini veya `:` işaretini zaman zaman rakam sanabilir; bu sürümde geometrik kurallar sadece uygun alan/değer kutularını düzeltir.
- Her PDF/tablo yüzde 100 doğru çıkarılmaz; doğrulama kullanıcı sorumluluğundadır.
- Hazır ZIP yalnız GitHub Actions'ın paketleme iş akışı başarıyla tamamlandığında yayınlanır.
