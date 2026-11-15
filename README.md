# Vivaldi Türkçe PDF OCR

**PDF üzerindeki mevcut seçilebilir metni koruyan; yalnız gerektiğinde, cihazda Türkçe OCR uygulayan, açık kaynak Vivaldi/Chromium eklentisi.**

> **BETA / DENEYSEL:** Resmî belgelerdeki isim, sayı ve tarihlerin OCR sonucunu orijinal PDF ile mutlaka karşılaştırın. Bu bir Chrome Web Store yayını değildir.

## ⬇️ Kuruluma hazır sürümü indir (Node.js gerekmez)

**[📦 SON SÜRÜMÜ İNDİR — GitHub Releases](https://github.com/numandegirmenci/vivaldi-turkce-pdf-ocr/releases/latest)**

GitHub'daki kaynak kod ZIP'ini değil, **Releases > Assets** altında sunulan `Vivaldi-Turkce-PDF-OCR-vX.Y.Z.zip` dosyasını indirin. Bu pakette PDF.js, Tesseract ve Türkçe OCR modeli **hazırdır**.

### İlk kurulum (Vivaldi)

1. Release ZIP dosyasını indirip sabit bir klasöre çıkarın.
2. Adres satırına `vivaldi://extensions` yazın.
3. **Geliştirici modu**nu açın.
4. **Paketlenmemiş öğe yükle**ye tıklayıp çıkardığınız **Eklenti** klasörünü seçin.
5. Eklenti simgesinden **PDF seç** ile deneyin.

**Önemli:** Eklentiyi yüklediğiniz klasörü daha sonra silmeyin veya taşımayın. Bilgisayar yöneticisi/şirket politikası geliştirici modu kullanımını engelliyorsa kurumunuzun BT birimine başvurun.

### Mevcut eklentiyi güncelleme

Release ZIP dosyasını çıkarın. İçindeki **Eklenti** klasörünün dosyalarını mevcut kurulumdaki **aynı Eklenti klasörünün üzerine** kopyalayın. `vendor/` klasörü yeni paketten güncellenecektir. Vivaldi'nin `vivaldi://extensions` sayfasında mevcut eklentinin **Yeniden yükle** simgesine basın. **Ayrıca yeni bir eklenti olarak yüklemeyin**; iki kopya PDF yönlendirmesinde çakışabilir.

### Tek tıkla yükleme ve otomatik güncelleme olur mu?

GitHub üzerinde **tek tıkla ZIP indirme** sağlanır, ancak **tarayıcı eklentisini doğrudan tek tıkla kurma ve arka planda otomatik güncelleme GitHub üzerinden sağlanmaz**. Bu kullanıcı deneyimi için eklentiyi [Chrome Web Store](https://chromewebstore.google.com/) üzerinden yayımlamak gerekir. Mağazada yayımlandığında Vivaldi/Chromium kullanıcıları tek seferde yükleyebilir ve tarayıcı uyumlu olduğunda güncellemeler otomatik gelir. Mağaza yayını şu anda yapılmamıştır.

## Özellikler

- PDF içindeki mevcut metin katmanını yeniden OCR ile bozmaz.
- Metin içermeyen sayfalara Türkçe OCR uygular; istenen sayfaya ayrıca **Bu sayfaya OCR** seçilebilir.
- OCR sonucundan **PDF metni**ne geri dönme seçeneği vardır.
- **Tam sayfa**, **Genişlik**, büyütme/küçültme seçenekleri sunar.
- PDF üzerinde metin seçimi ve yan panelden kopyalama olanağı verir.
- OCR işlemi yerel cihazda çalışır; PDF'ler harici bir OCR sunucusuna gönderilmez.

## Geliştirme ve test

Kaynak koddan derlemek isteyenler için Node.js 22 veya daha yeni önerilir:

```bash
npm install
npm test
npm run build
```

`npm run build`, `Eklenti/vendor/` klasöründeki PDF.js, Tesseract.js, WebAssembly dosyalarını ve Türkçe dil modelini indirip yerleştirir. **GitHub Releases paketini indiren son kullanıcılar bu komutları çalıştırmaz.**

`.github/workflows/release.yml` ana dala gönderilen değişikliklerde otomatik testleri çalıştırır, vendor dosyalarını hazırlar ve `package.json` ile `Eklenti/manifest.json` sürümleri eşleşiyorsa yeni GitHub Release paketini yayımlar. Yeni yayın için iki dosyadaki sürümü birlikte yükseltin. Yayın `Actions` üzerinden takip edilebilir.

## Bilinen sınırlamalar

- Karma tablo veya eski OCR katmanlı belgelerde metin hatalı hizalanabilir; özellikle SGK/kimlik/tablo gibi verilerde orijinali doğrulayın.
- Kurumsal oturum gerektiren bazı PDF URL'leri açılamayabilir. Bu durumda PDF'yi indirip **PDF seç** ile açın.
- Yerel dosya URL'lerinin otomatik algılanması için Vivaldi eklenti ayarlarından dosya erişimi izni gerekebilir.
- Geniş HTTP/HTTPS erişimi gerektirir. Kurumların BT politikalarına uygunluğunu kontrol edin.
- Eklenti halen beta aşamasındadır; gerçek Vivaldi ve farklı PDF örnekleriyle kullanıcı testi gerektirir.

## Lisans / gizlilik

Özgün kod MIT lisanslıdır. Üçüncü taraf bileşenler kendi lisansları altındadır: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Gizlilik bilgileri: [PRIVACY.md](PRIVACY.md).

Gizli, kurumsal veya kişisel bilgi içeren PDF belgelerini hata raporlarına veya GitHub deposuna yüklemeyin.
