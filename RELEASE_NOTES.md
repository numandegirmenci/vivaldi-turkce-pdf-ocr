# Türkçe PDF OCR (Chromium) v0.6.6 — Eski yazı izi temizliği ve OCR iyileştirmesi (Beta)

## Sorun ve düzeltme

Gerçek kullanıcı görüntüsünde “ÇALIŞMA BELGESİ” satırındaki eski harflerin gölgeleri/izleri kalıyor, yeni yazı eski yazının üzerine basılmış gibi görünüyordu.

**Sorunun kökü:** v0.6.5 eski yazının yalnız yüksek kontrastlı harf piksellerini şeffaf yama ile kapatıyordu. Baskı yumuşatması, tarama gürültüsü ve JPEG kaynaklı düşük kontrastlı eski harf çevresi temizlenmiyor, eklenen harflerle birlikte görünüyordu.

### v0.6.6 düzeltme motoru

- Tek tek eski harf maskesini temizlemek yerine, **yalnızca düz ve temiz kağıt olduğu doğrulanan OCR kelime alanının tamamı** çevre kağıt örneklerinden yeniden oluşturuluyor. Böylece eski yazının hem çekirdeği hem de soluk kenarları kaldırılıyor.
- Kenarlardaki kağıt renkleri yatay konuma göre örneklenip yumuşatılıyor; küçük kağıt tonu farkı ve tarama grisi korunmaya çalışılıyor.
- Onarım alanı sayfa dışında hiçbir pikseli değiştirmiyor. Kenarlardaki pikseller kademeli saydamlıkla bağlanıyor.
- Yakındaki başka bir kelime, çizgi, kaşe, logolu/desenli zemin, güçlü ton farklılığı veya harflerin seçim kenarına taşması durumunda **işlem güvenli biçimde reddediliyor**. Karmaşık desenler için gerçek görüntü tamamlama henüz uygulanmıyor.
- Mevcut özgün görüntü karşılaştırma, geri alma ve orijinale dokunmadan ayrı PDF dışa aktarma özellikleri korunuyor.
- Birim testlerine, eski yazının koyu çekirdeği kadar **soluk anti-alias/JPEG izlerinin de sıfıra indirilmesi** testi; Chromium uçtan uca testine eski iz kalıntısı kontrolü eklendi.

### Türkçe OCR doğruluğu

- Tesseract `tessdata_best/tur` yüksek kalite Türkçe modeli korunuyor. Daha küçük veya düşük kalite modele geçilmedi.
- OCR kelimesi güven puanı artık Tesseract sonuçlarından ve TSV'den saklanıyor.
- Belge düzeni (PSM 3), metin bloğu (PSM 6), seyrek metin ve başlık (PSM 11) okumaları, belgenin gerçek OCR başarısına göre otomatik seçiliyor.
- Zayıf veya eksik tanınan sayfalarda kontrastlı ikinci okumalar otomatik olarak deneniyor; yüksek güvenli uzun sayfalara gereksiz tekrar uygulanmıyor.
- OCR sonucu sıralaması sadece “en çok karakteri okuyan” yaklaşımından çıkarılıp **sayfa ve kelime güven puanı, okunabilir sözcük sayısı, satır yapısı ve hatalı karakterlerin cezalandırılması** ile güncellendi.
- OCR çözünürlüğü yüksek kalıyor; Tesseract'a 300 DPI okuma bilgisi veriliyor.

## Kullanım

1. Yeni ZIP'teki `Eklenti` klasörünü kurulu eklentiye kopyalayın (önce yedeğini alın).
2. `vivaldi://extensions` sayfasında eklentiyi yeniden yükleyin.
3. Orijinal taranmış PDF veya fotoğrafı açın. OCR işlemi tamamlandıktan sonra **Görünen yazıyı düzenle** → kelimeyi seç → yeni metni gir → **Uygula**.
4. **Orijinali göster** ile sonucu kontrol edin. Uygunsa **Düzenlenmiş PDF** ile kopyasını kaydedin.

## Sınırlamalar

- Düz kağıt üzerinde metin onarımı daha iyi hedeflenmiştir. **Desenli/renkli/filigranlı zeminlerde kusursuz iz temizliği veya fontun birebir eşleştirilmesi garanti değildir; sistem güvenilir değilse işlemi reddeder.**
- Bu dijital PDF içerisinde güvenli redaksiyon değildir. Eski PDF nesneleri içerikte kalabilir; resmî belgelerin aslı saklanmalıdır.
- Yeni sürüm, daha önce bozulmuş ve kaydedilmiş PDF'yi otomatik olarak orijinal hale getiremez. Değişiklikleri özgün belge üzerinde test edin.
- Otomatik Chromium görüntü ve OCR testleri geçse dahi kullanıcının kendi PDF'siyle gerçek Vivaldi oturumundaki gözlemi ayrıca gereklidir.
