# Türkçe PDF OCR — Chromium / Vivaldi (v0.6.1 Beta)

Vivaldi öncelikli; Chrome, Edge ve Brave üzerinde deneysel kullanılabilen, yerel çalışan Türkçe PDF OCR ve belge inceleme uzantısı. **v0.6.1 beta**; gerçek WhatsApp Web/Vivaldi uçtan uca doğrulaması tamamlanmamıştır.

## Kurulum — CMD gerekmez

1. [Releases](https://github.com/numandegirmenci/vivaldi-turkce-pdf-ocr/releases) sayfasındaki **v0.6.1 hazır ZIP** yayınlandıysa onu indirin. Kaynak kod ZIP'ini değil, **Assets** altındaki `Turkce-PDF-OCR-Chromium-v0.6.1.zip` dosyasını kullanın. Otomatik Release başarılı olmadan bağlantıyı hazır saymayın.
2. ZIP'i sabit bir klasöre çıkarın. Eski `Eklenti` klasörünü önce **yedekleyin**.
3. Daha önce kurulmuş uzantı varsa yeni `Eklenti` içeriğini (özellikle `vendor` klasörü dahil) aynı etkin klasörün üzerine **Ctrl+C / Ctrl+V** ile kopyalayın; eski klasörü silmeyin.
4. `vivaldi://extensions` adresinde **Yeniden yükle** düğmesine basın ve WhatsApp Web sekmesini F5 ile yenileyin. İlk kez kuruyorsanız **Geliştirici modu → Paketlenmemiş öğe yükle → Eklenti** yolunu izleyin.

> Kaynak koddan kurmak isteyenler için `npm install && npm run build` gerekir. Hazır dağıtım ZIP'i kullanıldığında CMD/PowerShell veya Node.js gerekmez. GitHub kaynak kod deposundaki `Eklenti/vendor` dosyaları derleme aşamasında hazırlanır.

## Özellikler

- **Türkçe OCR ve PDF:** PDF.js ile mevcut PDF yazı katmanını koruma; yazısız sayfalara Tesseract.js 5 OCR. Zayıf OCR sonucunda PSM 3/6 ve gerektiğinde kontrast denemeleri; alternatif OCR motoru **henüz entegre değildir**.
- **Seçim eşitleme:** Sol PDF'de metin seçildiğinde sağ metin alanında aynı karakter aralığı gerçekten seçilir ve Ctrl+C ile kopyalanabilir. OCR farkı varsa orijinal seçim ayrıca gösterilir. Sağdaki seçim ilgili PDF sayfasına yönlenir.
- **Çoklu tablo:** Aynı sayfada birden fazla ücret tablosu ve alan/değer kutusunu ayrı kartlarda gösterme; hücre düzenleme, Excel'e TSV kopyalama, CSV indirme.
- **Ayraç hatası:** `:` işaretinin OCR tarafından `1`, `3`, `I` veya `|` gibi okunmasını, yalnız birden fazla alanın geometrik kanıt sunduğu konumlarda tablonun hücresinde temizleme. **OCR metninin orijinali değiştirilmez; gerçek rakamlar rastgele silinmez.**
- **WhatsApp Web:** Yalnız kullanıcı etkinleştirince WhatsApp Web PDF/belge yakalama; yakalama açıkken normal sohbeti taramaz. Bir etkileşim için tek aktarım; otomatik yakalama başarısızsa **Açık PDF önizlemesini yakala** veya **Dosyadan seç**. Son dosyalar geçici sekme belleğinde tutulur.
- **Outlook ve OneDrive:** Doğrudan açılan görsellerin OCR görüntüleyicisine yönlendirilmesi; ek fotoğraf veya PDF bağlantısı üzerinde sağ tık → **PDF / görseli OCR ile aç**. Eklenti menüsündeki **Bu sekmedeki belgeyi OCR ile aç** seçeneği sekmeyi kapatmadan dosyayı okumayı dener. OneDrive yalnızca HTML önizleme sunuyorsa **İndir → PDF seç** kullanın.
- **Görünen yazıyı düzenle (v0.6.1):** PDF veya taranmış görselde OCR sözcüğüne tıklayın ya da fareyle alan seçin; yalnızca yeni yazıyı girip **Uygula** deyin. Renk, zemin ve normal/kalın görünüm orijinal sayfanın piksellerinden otomatik tahmin edilir. Önizlemeden sonra **Düzenlenmiş PDF** ile yeni dosyaya kaydedin. Sadece düz renkli alan kapama kullanır; orijinal PDF korunur. **Güvenli redaksiyon değildir**, desenli yüzeyleri tam onarmaz ve döndürülmüş sayfalarda desteklenmez.
- **Dosya türleri:** PDF, PNG/JPEG/WebP/GIF/BMP, DOCX, XLSX, PPTX, ODT, TXT, CSV/TSV, MD/LOG, JSON/XML/HTML, RTF. Word/Excel/PowerPoint dosyalarında biçim birebir korunmayabilir; eski DOC/XLS ve şifreli dosyalar desteklenmez.
- **Arama ve dışa aktarma:** Ctrl+F, F3, görünür sayfa tabanlı yükleme, sayfa gezgini, yakınlaştırma, döndürme, aranabilir PDF kaydetme. Dijital imzalar yeni PDF'de geçersiz olabilir.

## Sorun giderme

- **Düzenlenecek kelime tıklanamıyor:** Üstte **Görünen yazıyı düzenle** modunu açın, sayfanın OCR ile işlenmesini bekleyin veya yazının etrafını fareyle sürükleyerek alan seçin.
- **Yeni yazı arka planla uyumsuz:** Yeni sürüm yazı ve zemin rengini otomatik tahmin eder. Sonuç uyumsuzsa renk tahmini belirsiz olabilir; karmaşık/desenli zemin için görüntü tamamlama henüz yoktur.

- **OneDrive PDF açılmıyor:** Önizlemede doğrudan dosya sunulmuyor olabilir. Eklenti menüsünden yakalamayı deneyin; gerekirse OneDrive içindeki **İndir** seçeneğiyle kaydedip OCR ekranından **PDF seç** kullanın.
- **Outlook fotoğraf eki OCR ile açılmıyor:** Ek görselin üstüne sağ tıklayıp **PDF / görseli OCR ile aç** seçin. Bu yol da erişemiyorsa fotoğrafı indirip OCR ekranında seçin.

- **WhatsApp OCR sekmesi açılmadı:** WhatsApp farklı belge gösterimi kullanıyor olabilir. Açık PDF önizlemesi düğmesini veya belgeyi indirip **Dosyadan seç** seçeneğini kullanın.
- **Çok sayıda OCR sekmesi:** Eklentiyi yeniden yükleyip WhatsApp sekmesini de F5 ile yenileyin; eski OCR sekmelerini kapatın. Sorun devam ederse raporlayın; canlı entegrasyon doğrulanmış değildir.
- **Tablo bulunamadı / yanlış rakam:** Form/tablo OCR seçeneğini açıp ilgili sayfaya OCR uygulayın. Yanlış hücreleri elle düzeltin; ödeme tutarı, IBAN, tarihler ve sicil numaralarını orijinal belgeyle karşılaştırın.
- **Yeniden sürüme dönme:** Önce kurulu `Eklenti` klasörünüzün yedeğine dönün. `snapshots/v0.5.7/` altında önceki ayraç ayrıştırıcısının kodu saklanır; v0.5.7'ye tam dönüş için elinizdeki önceki kurulumu kullanın.

## Geliştirici

Node.js 22+:

```bash
npm install
npm test
npm run build
npm test
```

Otomatik testler gerçek WhatsApp Web/Vivaldi uçtan uca testinin yerine geçmez. Çekmece/yan panelde eklenti betikleri Vivaldi sürümüne göre farklı çalışabilir.

## Belgeler

- [`CHANGELOG.md`](CHANGELOG.md): 0.5.2–0.6.1 tüm değişikliklerin dökümü
- [`RELEASE_NOTES.md`](RELEASE_NOTES.md): bu sürümün yayın notları
- [`YAYIN_ONCESI_KONTROL.md`](YAYIN_ONCESI_KONTROL.md): manuel doğrulama listesi
- [`PRIVACY.md`](PRIVACY.md): veri işleme ve geçici depolama
- [`snapshots/v0.5.7/README.md`](snapshots/v0.5.7/README.md): geri dönüş notu

MIT lisansı, üçüncü taraf kütüphaneler için `THIRD_PARTY_NOTICES.md` geçerlidir. İşe özgü veya kişisel belge örneklerini GitHub Issues'a eklemeyin.
