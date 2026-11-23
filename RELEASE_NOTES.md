# Türkçe PDF OCR (Chromium) v0.6.5 — Görsel yazı düzenleme “Uygula” düzeltmesi (Beta)

## Düzeltilen davranış

Gerçek Vivaldi ekranındaki örnekte kullanıcı **AVCILAR → AKCIKAR** yazıyor, **Uygula** düğmesine basıyor ancak sayfa ve **Henüz değişiklik yok** yazısı değişmiyordu. Bu, son sürümün güvenlik kontrollerinin uygulamayı reddetmesine rağmen yalnızca ekranın en üstündeki durum çubuğuna hata yazmasından kaynaklanabiliyordu. Önceki sürümde tam olarak hangi kontrolün reddettiği ekranda görünmediği için sorun belirsizdi.

- **Uygula hatası artık görünür:** Sağdaki metin düzenleme panelinde, düğmenin hemen altında anlaşılır kırmızı uyarı görüntülenir. Örneğin seçim alanı darsa “daha geniş alan seç”, sayfa görünmüyorsa “OCR işlemini tamamla” gibi doğrudan öneri vardır. Düzenleme başarılı olursa panel kapanır ve değişiklik sayacı artar.
- **Dar OCR kelimesine otomatik güvenli pay:** OCR kelimeleri çoğu zaman tam harf sınırlarında kesilir. Yeni sistem kelime alanını çevresinde komşu kelime bulunmayan boşluk kadar otomatik büyütür. Diğer OCR kelimelerinin bir piksel bile üstüne çıkmadan genişletme yapar.
- **Harf boyutu artık seçim alanı büyüyünce büyümez:** Font boyutu gerçek kelime yüksekliğine sabitlenir. Önceki sürümde harfleri korumak için kutu genişletmek yeni metni de büyütüyor ve tekrar alan dışına taşıyordu.
- **Orijinal / Düzenlenmiş görüntü:** Başarılı Uygula işleminden sonra eğer “Orijinali göster” açık kalmışsa düzenlenmiş görüntüye otomatik geri döner.
- **Gerçek kullanıcı örneğine yakın regresyon testleri:** “AVCILAR → AKCIKAR” için OCR geometri, güvenli genişletme, orijinal yazı yüksekliğini koruma ve saydam piksel yaması testleri eklendi.
- **Başarısız işlem belgeyi değiştirmez:** Önceki v0.6.4 saydam piksel korumaları, komşu kelime kontrolü ve ayrı PDF çıktısı korunur.

## Kullanım

1. ZIP paketindeki `Eklenti` içeriğini mevcut kurulumun üstüne kopyalayın ve `vivaldi://extensions` sayfasında **Yeniden yükle** seçin.
2. Bozulmadan saklanmış orijinal PDF/fotoğrafı OCR ile açın, **Görünen yazıyı düzenle** modunu başlatın.
3. Kelimeye tıklayıp yeni metni girin, **Uygula** deyin. Yeni düzenleme uygulandıysa değişiklik sayacı artar. Reddedilirse **nedenini artık aynı sağ panelde göreceksiniz.**
4. Başarılı düzenlemeyi **Orijinali göster** ile kontrol edin; **Düzenlenmiş PDF** olarak ayrı kaydedin.

## Sınırlamalar

- Bu sürüm, kaynak görüntüdeki yazıya yakın bir stil oluşturma girişimidir. OCR koordinatlarının hatalı olduğu, arka planın desenli olduğu, metnin tanınamadığı veya alana sığmadığı durumlarda güvenli koruma mekanizmaları işlemi reddedebilir. Her belgenin başarıyla düzenleneceği garantisi yoktur.
- Eski PDF içine veri silme / güvenli redaksiyon değildir; orijinal PDF nesneleri altta kalabilir. Resmi belge asılları saklanmalı, düzenlenmiş kopya kontrol edilmelidir.
- Testlerin geçmesi gerçek Vivaldi ekranındaki aynı belge üzerinde uçtan uca görsel doğrulamanın yerini tutmaz.
