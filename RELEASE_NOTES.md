# Türkçe PDF OCR (Chromium) v0.6.4 — Görsel düzenleme güvenliği (Beta)

## Yeniden tasarlanan görsel metin düzeltme motoru

Önceki sürümlerde yeni yazı için seçilen OCR alanı, tümüyle opak bir dikdörtgen olarak kapatılabiliyordu. Bu yaklaşım bir kelimenin yanındaki harfleri ve sayfanın zeminini de bozabiliyordu.

v0.6.4'te:

- **Saydam düzeltme katmanı:** Orijinal sayfa görüntüsünü silip yeniden çizmek yerine, yalnız eski yazının yüksek kontrastla ayrıştırılabilen piksel maskesi temizlenir ve yeni harfler aynı saydam katmanda oluşturulur.
- **Dokunulmayan piksel korunur:** Algılanan eski harf maskesi ve yeni yazı maskesi dışındaki pikseller şeffaf kalır. Kaynak PDF ve orijinal sayfa görüntüsü değiştirilmez.
- **Güvenilir değilse işlem yapılmaz:** Harfler alanın kenarından taşarsa, zemin çok desenliyse, harf-zemin kontrastı yeterli değilse, yeni metin kesiliyorsa ya da OCR kutusu komşu kelimeyi örtüyorsa düzenleme iptal edilip sebebi gösterilir. Bu, yanlış ve geri alınamaz görsel değişiklik üretmekten daha güvenlidir.
- **OCR seçim payı:** Tek kelime seçildiğinde dar OCR kutusuna küçük bir güvenlik payı eklenir. Daha büyük bir alan gerektiğinde `Shift` + fareyle alan seçilebilir.
- **Önce / Sonra:** Sağ panelde **Orijinali göster / Düzenlenmişi göster** düğmesiyle orijinal sayfa ile geçici düzenleme karşılaştırılır.
- **PDF çıktısı:** Oluşturulan saydam PNG düzeltme yaması aynı şekilde PDF'ye eklenir; yeni yazı PDF'de aranabilir kalır. Görsel PDF dışa aktarımı artık opak dikdörtgen alternatifine düşmez.
- **Otomatik görsel sınır testleri:** Temiz taranmış yazı, bozuk zemin, düşük kontrast, alan kenarı, harf kesilmesi ve dokunulmayan piksellerin korunması için RGBA piksel testleri eklendi.

### Kullanım

1. Orijinal PDF veya fotoğrafı OCR ile aç.
2. **Görünen yazıyı düzenle** modunu aç; kelimeye tıkla. OCR alanı darsa **Shift + sürükle** ile uygun bir bölge seç.
3. Yeni metni gir ve **Uygula**. Motorun güvenli bulmadığı bölgeye müdahale edilmez.
4. **Orijinali göster** ile kontrol et. Uygunsa **Düzenlenmiş PDF** ile orijinale dokunmadan ayrı bir kopya kaydet.

### Sınırlar ve dikkat edilmesi gerekenler

- Yeni motor, *garanti edilmiş Adobe Scan düzeyinde font tanıma veya yapay zeka görüntü onarımı değildir*. Orijinal harflerin biçiminden yakın font tahmini yapar; karmaşık zeminleri ve el yazısını güvenilir biçimde onaramıyorsa değişiklik yapmaz.
- Şeffaf piksel yaması yalnız tespit edilen harflere müdahale eder. OCR eksik veya hatalıysa, sistemin reddettiği alanı zorla düzenleme özelliği yoktur.
- Yeni PDF güvenli redaksiyon değildir; eski dijital içerik altta kalabilir. Kaynak belgelerin aslı saklanmalı, değişiklikler kontrol edilmelidir.
- Daha önce v0.6.0–v0.6.3 ile bozulup PDF olarak kaydedilmiş dosyaların piksel kaybı otomatik geri getirilemez; **orijinal dosyadan çalışın**.
- Otomatik piksel testleri ve PDF entegrasyon testleri gerçek Vivaldi/Outlook/OneDrive oturumunda yapılan manuel görsel kalite testlerinin yerine geçmez.
