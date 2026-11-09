# Türkçe PDF OCR — Vivaldi / Chromium (deneysel)

Taranmış PDF'lerden **Türkçe OCR** ile metin çıkaran ve metni sayfa üstünde seçip kopyalamayı hedefleyen açık kaynak bir tarayıcı eklentisi prototipi.

**Durum: BETA / DENEYSEL.** Gerçek kullanımda bazı PDF'ler açılamayabilir, metin katmanı kayabilir veya OCR yanlış sonuç verebilir. Henüz Chrome Web Store yayını için onaylanmış ya da kapsamlı test edilmiş değildir.

## Özellikler

- `.pdf` bağlantılarını yakaladığında Vivaldi içinde ayrı bir OCR görüntüleyicisi açmayı dener.
- Taranmış sayfalarda cihaz üzerinde Tesseract.js + Türkçe `tessdata_best` modelini kullanır.
- PDF üzerinde metin seçimi ve sağ panelde düz metin kopyalama sunar.
- Metin seçme vurgusu yarı saydamdır.
- OCR işleme için belgeleri bir bulut OCR sunucusuna yüklemez.
- Önceki prototipte PDF olmayan bir sayfayı açma sırasında görülen bazı yönlendirme sorunlarına karşı ek kontrol içerir.

## Windows üzerinde kurulum

1. Depoyu ZIP olarak indirip sabit bir klasöre çıkar.
2. **Node.js** ve `npm` bilgisayarında erişilebilir olmalı. Taşınabilir Node.js ZIP sürümü de kullanılabilir.
3. `HAZIRLA.cmd` dosyasını çalıştır. Bu işlem npm bağımlılıklarını ve Türkçe modeli indirip `Eklenti/vendor/` klasörünü oluşturur.
4. Vivaldi'de `vivaldi://extensions` aç, **Geliştirici modu** ve **Paketlenmemiş öğe yükle** seçenekleriyle `Eklenti` klasörünü seç.
5. PDF bağlantılarını açmayı dene veya eklenti simgesi > **PDF dosyası seç** ile yerel dosya aç.

> **Not:** `Eklenti/vendor/` sürüm kontrolünde tutulmuyor. `HAZIRLA.cmd` çalıştırılmadan eklenti eksiktir. Kullanıcıların kolay kurulum yapabilmesi için ileride bağımlılıkları dahil eden ayrı bir sürüm ZIP'i yayımlanabilir.

## Bilinen sınırlamalar

- PDF, Vivaldi'nin yerleşik PDF ekranında değil, eklentinin kendi sekmesinde açılır.
- Oturum isteyen ya da geçici URL'ler, tekrar `fetch` edildiğinde giriş ekranı döndürebilir. Böyle durumlarda PDF'yi indirip **PDF seç** kullan.
- OCR doğruluğu belge kalitesine bağlıdır. **Resmi veya hukuki belgelerde OCR metni mutlaka aslıyla karşılaştırılmalıdır.**
- Çok sütunlu PDF'ler, tablolar, damgalar ve el yazısı hatalı tanınabilir.
- Eklenti geniş alan adı erişimi talep eder çünkü farklı sitelerdeki PDF'leri yeniden almayı dener. İzinlerin daraltılması planlanan bir geliştirmedir.
- Giriş ekranı gibi normal web sayfalarını PDF sanmamak için ek kontroller vardır; ancak her siteyle uyumluluk garanti edilmez.

## Lisans ve gizlilik

Bu projeye ait özgün kaynak kodu [MIT Lisansı](LICENSE) kapsamındadır. Üçüncü taraf kütüphaneler bağımsız lisanslarına tabidir; ayrıntılar [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dosyasında. Gizlilik açıklaması [PRIVACY.md](PRIVACY.md) dosyasında.

**Gerçek kişilerden veya kurumsal belgelerden alınmış test PDF'lerini, ekran görüntülerini ve kişisel bilgileri GitHub deposuna eklemeyin.**

## Topluluk geri bildirimi

Hata bildirimlerinde Vivaldi sürümü, PDF'nin taranmış olup olmadığı ve adımlar yer alabilir. Gizli, ticari veya kişisel bilgi içeren PDF paylaşmayın.
