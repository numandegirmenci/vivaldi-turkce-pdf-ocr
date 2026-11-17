# Türkçe PDF OCR — Chromium Tarayıcıları (Beta)

**PDF içindeki mevcut seçilebilir metni koruyan, yalnızca gerektiğinde cihaz üzerinde Türkçe OCR uygulayan, ücretsiz ve açık kaynaklı bir tarayıcı eklentisi.**

> **BETA / DENEYSEL:** Eklenti Manifest V3 ve Chromium API'leriyle yazılmıştır. Vivaldi öncelikli geliştirme hedefidir; Google Chrome, Microsoft Edge ve Brave için gerçek tarayıcı üzerinde uçtan uca uyumluluk testleri henüz tamamlanmamıştır. **Bu tarayıcılarda kesin sorunsuz çalıştığı iddia edilmez.** Özellikle otomatik PDF yakalama, tarayıcının PDF görüntüleyicisine göre değişebilir.
>
> Resmî belgelerdeki isim, sayı, tarih ve tablo verilerini OCR çıktısına güvenmeden önce orijinal belgeyle karşılaştırın. Bu bir Chrome Web Store yayını değildir.

## Hangi iş yükünü azaltmayı amaçlıyor?

- **Yeniden yazma:** Taranmış dilekçe, sözleşme, ruhsat veya yazılardaki metinleri elle yazmak yerine OCR sonrası seçip kopyalamayı kolaylaştırır.
- **Uygulama değiştirme:** PDF'yi ayrı bir OCR sitesine yükleme veya başka bir programa taşıma ihtiyacını azaltır.
- **Gereksiz OCR:** Mevcut seçilebilir metni yeniden işleyerek bozmaz; metinsiz sayfalarda OCR kullanır.
- **Karma belgeler:** Sorunlu bir sayfayı ayrıca OCR ile okuyabilir; gerektiğinde PDF'nin kendi metnine geri dönülebilir.
- **Gizlilik:** OCR işlemi cihazda gerçekleşir; PDF içeriği uygulamaya ait bir OCR sunucusuna yüklenmez.

## İndir — hazır paket (Node.js gerekmez)

**[📦 GitHub Releases — son sürüm](https://github.com/numandegirmenci/vivaldi-turkce-pdf-ocr/releases/latest)**

Kaynak kod ZIP'i yerine **Releases > Assets** altındaki `Turkce-PDF-OCR-Chromium-vX.Y.Z.zip` paketini indirin. Paket PDF.js, Tesseract ve Türkçe OCR modelini içerir. Önceki v0.3.0 sürümünün paket adı farklıdır.

## Tarayıcı uyumluluğu

| Tarayıcı | Durum | Eklenti sayfası |
| --- | --- | --- |
| Vivaldi | Öncelikli hedef; gerçek kullanıcı PDF'leriyle test gerekli | `vivaldi://extensions` |
| Google Chrome | Chromium / Manifest V3 altyapısıyla uyumlu olması bekleniyor; uçtan uca test bekliyor | `chrome://extensions` |
| Microsoft Edge | Chromium / Manifest V3 altyapısıyla uyumlu olması bekleniyor; uçtan uca test bekliyor | `edge://extensions` |
| Brave | Chromium tabanlı; uçtan uca test bekliyor | `brave://extensions` |

**Not:** Tarayıcı sürümü, kurumsal politika ve yerleşik PDF görüntüleyicisi davranışı sonucu etkileyebilir. Otomatik açma gerçekleşmezse eklenti simgesindeki **PDF dosyası seç** seçeneğini kullanın.

### Kurulum

1. Releases sayfasından son sürüm ZIP'ini indirip sabit bir klasöre çıkarın.
2. Tarayıcınızın yukarıdaki **eklenti sayfasını** açın.
3. **Geliştirici modu**nu etkinleştirin.
4. **Paketlenmemiş öğe yükle / Load unpacked** ile ZIP'ten çıkan **Eklenti** klasörünü seçin.
5. Eklenti simgesine tıklayıp **PDF dosyası seç** ile kişisel bilgi içermeyen örnek bir PDF üzerinde deneyin.

Eklentinin bulunduğu klasörü silmeyin veya taşımayın. `file://` PDF adreslerinin otomatik açılması için tarayıcıdan **Dosya URL'lerine erişime izin ver** ayarı gerekebilir. Kurumsal bilgisayarlarda BT politikalarını kontrol edin.

### Mevcut kurulumu güncelleme

Son sürüm ZIP'ini çıkarın. İçindeki **Eklenti** klasörünün **tüm dosyalarını ve vendor klasörünü** eski kurulumdaki **aynı Eklenti** klasörüne kopyalayıp üzerine yazın. Sonra tarayıcınızın eklenti sayfasında mevcut eklentinin **Yeniden yükle** düğmesine basın. Ayrı bir ikinci eklenti yüklemeyin; iki kopya PDF yönlendirmesinde çakışabilir.

**GitHub üzerinden otomatik kurulum veya otomatik güncelleme yoktur.** Bu kullanıcı deneyimi için uygun bir tarayıcı mağazasında ayrıca yayın yapmak gerekir.

## Özellikler

- PDF'deki hazır metni korur; metinsiz sayfalarda Türkçe OCR uygular.
- PDF'ler varsayılan olarak **Genişlik** modunda açılır; **Tam sayfa** ve büyütme/küçültme seçenekleriyle görünümü değiştirebilirsin.
- **Bu sayfaya OCR** ve **PDF metni** seçenekleriyle sayfa bazlı düzeltme yapılabilir.
- PDF üzerinde metin seçimi ve yan panelden kopyalama sunar.
- OCR yerel bilgisayarda çalışır; harici OCR servisine belge gönderilmez.

## Geliştirme ve test

Kaynak koddan hazırlamak isteyenler için Node.js 22+ önerilir:

```bash
npm install
npm test
npm run build
```

`npm run build` üçüncü taraf paketleri ve Türkçe OCR dil modelini `Eklenti/vendor/` içine hazırlar. **GitHub Releases paketini indiren kullanıcıların Node.js kurmasına gerek yoktur.**

Otomatik testler temel metin işleme, sayfa ölçekleme, yönlendirme ve Manifest V3 yapılandırmasını denetler. **Bunlar Chrome / Edge üzerinde gerçek PDF ve gerçek OCR uçtan uca testi yerine geçmez.** [Yayın öncesi kontrol listesi](YAYIN_ONCESI_KONTROL.md) açık test adımlarını içerir.

## Bilinen sınırlamalar

- Eski OCR katmanlı belgelerde ve karma tablolarda metin hatalı hizalanabilir.
- Giriş gerektiren PDF URL'leri her zaman açılamayabilir; PDF'yi indirip **PDF dosyası seç** ile açın.
- Otomatik PDF yakalama her Chromium tarayıcısında aynı davranmayabilir.
- Eklenti geniş HTTP/HTTPS izinleri ister; kurumsal ortamlarda BT güvenlik ilkelerine göre değerlendirilmeli.
- Bu sürüm betadır; gerçek cihazlarda ve farklı PDF türlerinde kullanıcı testleri gereklidir.

## Lisans ve gizlilik

Özgün kod MIT lisanslıdır. Üçüncü taraf bileşenlerin koşulları [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), gizlilik açıklaması [PRIVACY.md](PRIVACY.md) dosyasındadır.

Hata bildirimi için gizli, kişisel veya kurumsal belgeleri GitHub'a yüklemeyin.
