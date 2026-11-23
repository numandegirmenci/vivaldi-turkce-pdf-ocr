# Türkçe PDF OCR (Chromium) v0.6.3 — Beta

## Ekran görüntülerinden tespit edilen düzenleme hataları

Bu güncelleme, taranmış bir sayfada başlık metinlerinin aşırı daralması ve komşu yazıların görsel olarak kısmen örtülmesi sorunlarını gidermeye odaklanır.

- **Aşırı dar/uzun yazıya engel:** Önceki sürüm, font adaylarında yatay genişliği orijinalin %43'üne kadar daraltabiliyordu. Artık otomatik karşılaştırma çok dar/geniş font adaylarını eler. Düzenlenen yazının genişlik oranı %84'ün altına iniyorsa hatalı görüntü üretmek yerine daha geniş alan seçilmesini ister.
- **Komşu yazıyı koruma:** Düzeltme kutusu seçilmeyen başka bir OCR sözcüğünü kısmen kapatacaksa işlem iptal edilir. Böylece bir satırdaki diğer harflerin yanlışlıkla silinmesi azaltılır.
- **Zemin rengini doğru yerden okuma:** Kağıt/zemin, yakın örnek sözcükten değil, düzenlenen sözcüğün kendi orijinal görüntüsünden okunur. Yakındaki sözcük yalnız yazı karakteri ve renk tahmini için referans olabilir.
- **Sarı arama vurgusu düzenlemeyi etkilemez:** Arama sonucunu gösteren sarı vurgu, düzenleme moduna geçildiğinde temizlenir ve düzenleme sırasında gizlenir. Bu vurgu orijinal belge rengi değildir.
- **Özel yazı bölgesi:** OCR'nin verdiği kelime alanı çok darsa, düzenleme modunda **Shift + fareyi sürükle** ile daha geniş bir alan seçilebilir.
- Normal OCR, WhatsApp/Outlook/OneDrive yakalama, tablo, seçilebilir PDF ve önceki sürümlerin temel iş akışları korunur.

## Kurulum

GitHub Release'deki `Turkce-PDF-OCR-Chromium-v0.6.3.zip` dosyasını indirin. Mevcut `Eklenti` klasörünüzün yedeğini aldıktan sonra ZIP içindeki `Eklenti` içeriğini mevcut dosyaların üzerine kopyalayın. Vivaldi'nin `vivaldi://extensions` sayfasından **Yeniden yükle** seçin.

**Not:** Eklentinin yeniden yüklenmesi açık belgenin kaydedilmemiş görsel düzeltmelerini korumaz. Önce orijinal dosyayı saklayın ve gerekli notlarınızı kaydedin; mevcut bozuk düzenlemeleri yeni sürüme taşımayın.

## Kalite sınırları

- Bu, taranmış belgeden yaklaşık yazı görünümü çıkaran beta motordur; orijinal fontun yüzde yüz aynı olduğunu garanti edemez.
- İşlem alttaki orijinal PDF nesnelerini güvenle silmez; redaksiyon için uygun değildir. Resmi belgelerin aslı korunmalıdır.
- Karmaşık/desenli zemin ve döndürülmüş sayfalar için tam destek yoktur.
- Otomatik kod/PDF testleri tarayıcıda aynı belgeyi yeniden açıp görsel olarak doğrulamanın yerine geçmez. Gerçek bir tarama için sonuç ayrıca kontrol edilmelidir.
