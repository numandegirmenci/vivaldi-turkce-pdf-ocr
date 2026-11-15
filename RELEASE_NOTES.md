## Vivaldi Türkçe PDF OCR 0.3.0 — Beta

- PDF'de var olan metin katmanını, kısa anlamlı metinlerde bile korur.
- Gömülü metin bulunmayan sayfaları Türkçe OCR ile işler; tüm belgeyi zorla OCR etmek yerine tek sayfa OCR seçeneği sunar.
- **Tam sayfa** ve **Genişliğe sığdır** görünümü, metin katmanının yerleşimi ve çok sayfalı belgelerdeki işlem akışı iyileştirildi.

### Kurulum (Node.js gerekmez)

1. Aşağıdaki **Vivaldi-Turkce-PDF-OCR-v0.3.0.zip** dosyasını indirip sabit bir klasöre çıkartın.
2. Vivaldi'de `vivaldi://extensions` adresini açıp **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş öğe yükle** ile ZIP'ten çıkan **Eklenti** klasörünü seçin.
4. Eklenti simgesinden PDF seçerek test edin. Yerel `file://` PDF erişimi gerekiyorsa eklentinin ayarından ayrıca izin verin.

**Güncelleme:** Daha önce bu projeyi yüklediyseniz eski **Eklenti** klasörünün içeriğinin yerine yeni sürümün içeriğini koyup aynı klasörü koruyun; ardından `vivaldi://extensions` sayfasından **Yeniden yükle** düğmesine basın. İkinci kopyayı yüklemeyin.

> GitHub'dan indirilen paket **kendiliğinden yüklenmez veya otomatik güncellenmez**. Gerçek tek tıklamalı tarayıcı yüklemesi/otomatik güncelleme için Chrome Web Store yayını gerekir.
>
> OCR çıktısı resmî/kurumsal belgelerde mutlaka aslıyla kontrol edilmelidir. Bu sürüm betadır.
