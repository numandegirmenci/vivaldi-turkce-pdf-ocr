# Türkçe PDF OCR (Chromium) v0.6.1 — Beta

**Tarih:** 23 Kasım 2026

## Görseldeki özgün metne göre otomatik düzenleme

- Kullanıcının yazı ve arka plan rengini ya da kalınlığını elle seçmesine gerek kalmaz.
- Bir OCR sözcüğüne tıklanır veya bir yazı bölgesi işaretlenir. Uygulama **orijinal PDF sayfasının piksellerini** okuyarak çevre zeminini ve harflerin rengini otomatik tahmin eder.
- Yazı kutusunun boyutundan yaklaşık font büyüklüğü çıkarılır; yoğunluğuna göre normal/kalın yazı tahmin edilir.
- Açık/koyu zemin üzerindeki farklı renkli yazılar için görüntüden örneklemeli renk algılama uygulanır.
- Düzenleme paneli yalnızca **Yeni yazı → Uygula** adımını ister. Algılanan özgün renkler bilgilendirme amacıyla gösterilir.
- **Düzenlenmiş PDF** çıktısında renkler kullanılır; algılanan kalın yazılar için Türkçe karakter destekli Noto Sans Bold fontu eklenmiştir.
- Eski OCR kelimesinin yeni PDF'nin görünmez metin katmanında yanlışlıkla tekrar eklenmesini önleyen v0.6.0 sistemi korunur.
- OneDrive/Outlook/WhatsApp dosya yakalama, OCR, tablo ve mevcut görünüm korunur.

## Kurulum

1. GitHub Release Assets bölümündeki `Turkce-PDF-OCR-Chromium-v0.6.1.zip` dosyasını indirin.
2. Mevcut `Eklenti` klasörünün **yedek kopyasını** alın; ZIP'teki `Eklenti` içeriğini kurulu klasör üzerine kopyalayın.
3. `vivaldi://extensions` adresinde eklentiyi yeniden yükleyin. WhatsApp Web açıksa F5 uygulayın.

## Kullanım

**Görünen yazıyı düzenle** düğmesine basın, değiştirmek istediğiniz özgün yazıyı tıklayın veya alan seçin. Panelde yeni metni yazıp **Uygula** deyin. Sonucu **Düzenlenmiş PDF** ile kaydedin.

## Dikkat

- Görselden font ailesini, italik stili veya orijinal baskı tekniklerini **kusursuz belirlemek mümkün değildir**. Renk, yaklaşık boyut ve kalınlık görüntüden otomatik tahmin edilir; PDF çıktısı destekli Noto Sans fontlarıyla oluşturulur.
- Dokulu, damgalı veya fotoğraflı arka planlarda düz renk kapama birebir onarım sağlamaz. Renk örneklemesi düşük güven düzeyinde sonuç verebilir.
- Bu **güvenli redaksiyon değildir**; eski dijital PDF metni altta kalabilir. Belgedeki gizli bilgileri kalıcı silmek için kullanılmamalıdır.
- Döndürülmüş sayfalarda görsel metin düzenleme desteklenmez. Dijital imzalı PDF'nin yeni çıktısında imzalar geçersiz olabilir.
- Otomatik testler canlı Vivaldi ve gerçek Outlook/OneDrive oturumlarında uçtan uca kullanımın yerini tutmaz.
