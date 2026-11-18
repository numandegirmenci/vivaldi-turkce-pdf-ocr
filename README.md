# Türkçe PDF OCR — Chromium tarayıcıları (v0.5.8 Beta)

Ücretsiz, açık kaynaklı, **yerel** PDF görüntüleyici ve Türkçe OCR eklentisi. Özellikle Vivaldi hedeflenir; Chrome, Edge ve Brave deneysel olarak desteklenir.

> **BETA:** Farklı Chromium sürümleri ve kurumsal PDF dosyaları üzerinde kapsamlı gerçek tarayıcı testleri tamamlanmadı. Önemli sayı, tarih, tablo ve resmî evrak verilerini orijinal PDF ile doğrulayın. OCR hataları olabilir.

## Hazır kurulum
**[Son GitHub Release](https://github.com/numandegirmenci/vivaldi-turkce-pdf-ocr/releases/latest)** üzerinden `Turkce-PDF-OCR-Chromium-v0.5.1.zip` dosyasını indirin. Kaynak kod ZIP'i yerine **Assets** bölümündeki hazır ZIP'i kullanın; üçüncü taraf bileşenleri ve Türkçe dil modelini içerir.

1. ZIP'i bilgisayarda **sabit bir klasöre** çıkarın.
2. Vivaldi'de `vivaldi://extensions` (Chrome: `chrome://extensions`, Edge: `edge://extensions`, Brave: `brave://extensions`) sayfasını açın.
3. **Geliştirici modu** → **Paketlenmemiş öğe yükle** → paket içindeki **Eklenti** klasörü.
4. Eklenti simgesinden **PDF dosyası seç** ya da doğrudan bir PDF bağlantısını açın.
5. Var olan eklentiyi yeniliyorsanız ikinci bir kopya kurmayın; aynı eklenti klasörünü güncelleyin.

## v0.5.8 (Beta, 18 Kasım 2026) — Geliştirme paketi

> Bu bölüm, v0.5.2–v0.5.8 yerel beta değişikliklerinin kaynak kodla birlikte yayınlanmasını belgeliyor. Resmi/finansal belgelerde OCR çıktısını mutlaka özgün belgeyle doğrulayın.

**Yeni:** İsteğe bağlı WhatsApp yakalama, farklı PDF'leri açıp ilk dosyaya geri dönebilme, gereksiz OCR sekmelerinin açılmasına karşı tek-aktarım kontrolü, PDF dışı belgeleri açma, soldaki metnin sağda gerçek seçimi, çoklu ücret/alan-değer tablosu, Excel/CSV çıktısı ve `:` işaretinin `1`/`3` sanılmasına karşı koordinat temelli sınırlı temizleme.

**Kurulum (CMD gerekmez):** GitHub Actions tarafından üretilen **v0.5.8 hazır ZIP'i** Releases → Assets bölümünden indirin; mevcut `Eklenti` klasörünün tamamını yedekleyin; yeni ZIP içindeki `Eklenti` içeriğini (vendor dahil) aynı klasörün üzerine kopyalayın; `vivaldi://extensions` → Yeniden yükle; WhatsApp Web'i F5 ile yenileyin. Hazır ZIP oluşmadan kaynak kod ZIP'ini eklenti olarak kurmayın.

**OCR motoru:** Tesseract.js 5. PaddleOCR veya başka bir OCR motoruna henüz geçilmedi. Tablolar koordinatlara göre ayrıştırılır fakat her çizgi/rakam kesin ayırt edilemez.

**Geri dönüş:** v0.5.7 yerel beta yedeğini saklayın. `snapshots/v0.5.7` altında önceki tablo ayırıcı dosyalarının kodu saklanacaktır; bu dosyalar tek başına tam uzantı değildir.

## v0.5.1 — WhatsApp Web PDF yakalama ve yeniden açma (Beta)

- WhatsApp'ta **📄 PDF OCR ile aç** düğmesine basın; **45 saniye** içinde PDF dosyasına tıklayın. Normal PDF önizlemesinde bir PDF blob bağlantısı bulunursa yakalanabilir. WhatsApp farklı bir gösterim kullanırsa üstteki **PDF düzenle** seçeneği PDF'yi oluşturduğunda da yakalamayı dener.
- PDF başarıyla açıldıktan sonra WhatsApp ekranında **↻ Son PDF** düğmesi görünür. OCR sekmesini kapatmış olsanız bile aynı dosyayı **5 dakika boyunca** bu düğmeyle tekrar açabilirsiniz. WhatsApp sekmesi yenilenirse veya 5 dakika geçerse geçici kopya silinir.
- PDF açma işlemi WhatsApp'ın normal tıklama davranışını artık geciktirmez. Açılma sırasında status mesajı gösterilir.
- Eklenti WhatsApp sohbetlerini izlemez; yakalama yalnız açık onayla etkinleşir ve son PDF yalnız cihazın geçici belleğinde tutulur. 32 MB sınırı sürer.

**Önemli:** WhatsApp Web'in bazı önizlemeleri PDF verisini tarayıcıda yakalanabilir bir Blob olarak sunmayabilir. Böyle durumlarda PDF düzenle seçeneğini deneyin; o da işe yaramazsa PDF'yi indirip eklentide PDF seç ile açın. Normal Vivaldi sekmesinde test edin; panelde betik çalışması garanti değildir.

## v0.5.0 — WhatsApp entegrasyonunun ilk sürümü

1. Güncellenmiş eklenti ile **Vivaldi'de WhatsApp Web** (`web.whatsapp.com`) sayfasını yenileyin.
2. Sağ altta çıkan **📄 PDF OCR ile aç** düğmesine basın.
3. **45 saniye içinde** sohbetinizdeki PDF belgesine tıklayın. Eklenti, PDF veri akışı tarayıcıda mevcutsa dosyayı indirmeden OCR görüntüleyicisine aktarmayı dener.
4. Başarılı olursa PDF yeni bir Vivaldi sekmesinde, **Genişlik** modunda açılır.
5. WhatsApp arayüzü değişirse veya PDF farklı bir biçimde aktarılırsa yakalama mümkün olmayabilir; bu durumda WhatsApp'tan PDF'yi indirip **PDF seç** ile açın.

**Gizlilik:** Eklenti mesaj içeriğini veya kişi listesini okumaz. PDF yakalamayı yalnız sizin düğmeye bastığınız 45 saniyelik pencerede dener. Dosya aktarımı yalnız cihazınız içinde gerçekleşir; geçici aktarım parçaları tarayıcı eklentisinin yerel deposunda en fazla 10 dakika tutulur ve dosya açılınca silinir. Bu özellik isteğe bağlıdır; otomatik sohbet taraması yapılmaz.

**Sınır:** WhatsApp Web'i Vivaldi'nin yan panelinde açtıysanız, tarayıcının eklenti betiklerini web paneline enjekte etmesine bağlı olarak düğme görünmeyebilir. Böyle olursa WhatsApp Web'i normal Vivaldi sekmesinde açarak deneyin.

## v0.4.0 — Önceki sürümden gelen özellikler

- **Varsayılan Genişlik modu:** Açılan PDF görüntüleme alanına enlemesine sığar. İsterseniz **Tam sayfa** kullanabilirsiniz.
- **PDF'de arama:** Ctrl+F ile arama, F3 / Shift+F3 ile sonuç gezme, eşleşen sayfalarda sarı işaretler. Tarama PDF'lerinin tamamında aramak için **Tüm sayfalarda ara** düğmesini kullanın.
- **Yüksek sayfalı belgeler:** Sayfa kabukları önce gelir, görünür sayfalar gerektiğinde işlenir. Canvas sayısı sınırlanır. **Tüm metni hazırla** tüm sayfaları sıralı işleyerek kopyalama/arama için hazırlar.
- **OCR geliştirmesi:** PDF'de mevcut yazı varsa korunur; yalnız metinsiz sayfalar OCR edilir. İsteğe bağlı **Form/tablo için gelişmiş OCR** ile kontrast ve seyrek metin okuma modu denenebilir.
- **Sütunları koruyarak kopyala:** OCR sözcük kutularından satır, boşluk ve sekmeler oluşturulur; tablolarda yaklaşık sütun ayrımı yapılır. Orijinal yazı da seçilip Ctrl+C ile kopyalanabilir.
- **Klavye kısayolları:** Ctrl+F ara, F3/Shift+F3 sonraki/önceki, J/K sayfa, +/- yakınlaştır, 0 genişlik, 1 tam sayfa, Ctrl+S aranabilir PDF indir.
- **Sayfa gezgini:** Sayfa numarasına gitme ve sayfayı 90° döndürme.
- **Aranabilir PDF kaydı:** Taranmış sayfalara, Türkçe karakterleri destekleyen görünmez OCR metin katmanı ekleyerek yeni PDF dosyası oluşturur; mevcut PDF'nin görüntüsünü korur. Orijinal PDF üzerinde değişiklik yapmaz.
- **Kolay güncelleme yardımcısı (Windows):** ZIP'in yanındaki `KOLAY_GUNCELLE.cmd` mevcut Eklenti klasörünü yedekler, son resmi Release paketini indirip aynı klasöre kopyalar. **Ardından tarayıcının eklenti sayfasından Yeniden yükle yapılmalıdır.**

**Sınır:** Doğrudan GitHub ZIP ile kurulmuş paketlenmemiş uzantıyı Chrome/Vivaldi kendiliğinden otomatik güncellemez. Eklenti için gerçek tam otomatik güncelleme isteniyorsa bir uzantı mağazasında yayınlama ve mağazanın güncelleme kanalı gerekir.

## Kullanım ipuçları

- Tüm PDF metnini sağ panelden alacaksanız **Tüm metni hazırla** ile belgenin tamamını işleyin; çok sayfalı taramalar zaman alabilir.
- **Form/tablo için gelişmiş OCR** yalnız gerektiğinde deneyin. İyi OCR katmanlarını yeniden OCR etmeniz doğruluğu azaltabilir.
- **Aranabilir PDF** mevcut dijital imzaları geçersiz kılabilir; imzalı belgelerde orijinali saklayın.
- Şifreli PDF, bozuk PDF ve bazı giriş gerektiren bağlantılar açılamayabilir.
- Karmaşık tabloların hücre sırası ve OCR sözcük koordinatları her zaman tam doğru olmayabilir.
- Görüntüleyiciden dosya seçerek açma yereldir. Bağlantıyla açılan PDF'nin orijinal sunucusundan indirilmesi gerekebilir. OCR için harici sunucuya yüklenmez.

## Güncelleme

Sabit klasöre çıkardığınız pakette `KOLAY_GUNCELLE.cmd` dosyasını çalıştırıp eklentiyi güncelleyebilirsiniz. Windows güvenlik ilkeleri PowerShell çalıştırılmasını engelleyebilir. Böyle durumlarda yeni Release ZIP'indeki **Eklenti** klasörünün tüm içeriğini (vendor dahil) mevcut eklenti klasörünün üzerine kopyalayın ve Vivaldi'de `vivaldi://extensions` → **Yeniden yükle** yapın. ZIP içindeki eklenti klasörünü taşımayın veya silmeyin.

## Geliştiriciler

Node.js 22+ ile:

```bash
npm install
npm test
npm run build
npm test
```

`npm run build`, PDF.js, Tesseract, pdf-lib, fontkit, Türkçe OCR modeli ve OFL lisanslı Noto Sans dosyasını yerel `Eklenti/vendor` klasörüne kopyalar veya indirir. İndirme için GitHub erişimi gerekir. Hazır Release kullananların Node.js kurması gerekmez.

Otomatik testler metin düzenleme, varsayılan görünüm, bağlantı yönlendirme, yeni araçlar ve font/PDF entegrasyonunun bir bölümünü doğrular; **gerçek Vivaldi üzerinde uçtan uca doğrulama yerine geçmez.**

## Gizlilik ve lisans

Özgün kod MIT lisanslıdır. Üçüncü taraf bileşenler ve font için [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), gizlilik için [PRIVACY.md](PRIVACY.md) ve test listesi için [YAYIN_ONCESI_KONTROL.md](YAYIN_ONCESI_KONTROL.md) belgelerine bakın. Hata raporlarında kişisel veya kurumsal belge paylaşmayın.

## Güvenlik / WhatsApp PDF yakalama
- Yalnız `https://web.whatsapp.com/*` için içerik betikleri kurulur; başka sohbet sitelerine uygulanmaz.
- Bilgi ve dosya aktarımı otomatik değil, kullanıcı etkileşimi sonrası başlar; 32 MB sınır vardır.
- Sadece PDF imzası `%PDF-` olan veri kabul edilir; rastgele sitelerin mesajlarına yanıt verilmez.
- Geçici parçalar eklentinin IndexedDB deposunda tutulur ve belge açılınca silinir; başarısız/terk edilen aktarımın parçaları zaman aşımında temizlenir.
- WhatsApp veya Meta ile resmî bir entegrasyon değildir. Eklenti WhatsApp markasıyla bağlantılı değildir.
