# Değişiklik geçmişi

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
