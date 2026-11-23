# Türkçe PDF OCR (Chromium) v0.6.2 — Beta

**Tarih:** 23 Kasım 2026

## Düzeltme: Taranan sayfada yeni yazı eski yazıyla uyuşmuyor

Kullanıcı testindeki “BELEDİYE / BAŞKANLIĞI” örneğinde yeni yazı fazla temiz, küçük ve farklı karakter yapısındaydı. Önceki sürüm yalnızca renk ve basit kalınlık tahmini yapıyor, uzun metinleri kutuya sığdırırken font boyutunu küçültüyordu.

Bu sürümde:
- Seçilen metnin **aynı satırındaki yakın OCR sözcüğü**, örneğin “BELEDİYE”, otomatik yazı stili referansı olarak seçilir.
- Dört ek açık lisanslı font ailesi (Anton, Oswald, Roboto Condensed, Archivo Narrow) ile Noto Sans, özgün taranmış harflerin **piksel şekline göre** karşılaştırılır. Yazı ailesi ve kalınlık için en yakın aday tahmin edilir.
- Uzun metinlerde **harf yüksekliği korunur**, yazı yalnız yatay olarak sığdırılır. Sığmayan metin yerine küçük ve uyumsuz yazı üretmek yerine “daha geniş alan seç” uyarısı verilir.
- Beyaz dikdörtgen görünümü yerine, yazı kutusunun üst ve altından **özgün sayfa kağıt tonunu ve küçük tarama gürültüsünü** örnekleyen yerel görüntü yaması hazırlanır.
- Önizleme HTML/CSS metni değil, **özgün görüntü dokusuyla hazırlanmış bir PNG yaması** kullanır. Düzenlenmiş PDF **aynı PNG yamasını** içerir; önizleme ve çıktı farklı görünmez.
- Yeni yazı PDF'nin aranabilir metin katmanına da eklenir; düzenlenen OCR sözcüğünün eski hali ayrıca eklenmez.
- Sürekli mavi kesikli seçim çerçevesi kaldırıldı, çerçeve düzenleme modunda yalnız işaretlenince görünür.

## Kullanım ve kurulum

1. `Turkce-PDF-OCR-Chromium-v0.6.2.zip` indirip `Eklenti` klasörünü mevcut kurulumun üzerine kopyalayın (önce yedeğini alın).
2. `vivaldi://extensions` → Yeniden yükle.
3. PDF/fotoğrafı açın → **Görünen yazıyı düzenle** → sözcüğü tıklayın veya alan seçin → yeni metni girin → **Uygula** → **Düzenlenmiş PDF**.
4. En iyi sonuç için değiştirilecek sözcüğün bulunduğu satırda başka bir örnek yazı bulunması faydalıdır.

## Sınırlamalar

- Bu otomatik **yakın font eşleştirmesidir**; taranmış belgede kaybolmuş orijinal fontun kesin kimliği elde edilemez. Sonuç her zaman birebir aynı olmayabilir.
- Yazı stilinin resimden analizi karmaşık yerleşimler, dokulu/renkli kağıtlar, logolar, kaşeler ve damgalarda hata yapabilir; görüntü onarımı gerçek yapay zeka inpainting değildir.
- Bir satırda metin kutusuna sığmayan daha uzun yazıyı küçültmek yerine uygulama kullanıcıdan alanı genişletmesini ister.
- Bu özellik **güvenli redaksiyon / gizli veri silme değildir**. Eski dijital PDF içerikleri katmanlarda kalabilir. Resmi belgelerde değişiklikler doğrulanmalı ve belge aslı saklanmalıdır.
- PDF dijital imzaları yeni kopyada geçersiz olabilir. Döndürülmüş sayfalar görsel yazı düzenleme kapsamında değildir.
- Otomatik testlerin başarılı olması, gerçek OneDrive/Outlook oturumu ve tarayıcı ekranıyla manuel kalite testini tamamlamaz.
