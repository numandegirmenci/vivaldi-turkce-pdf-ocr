## Türkçe PDF OCR (Chromium) v0.3.2 — Beta

### Yenilik
- PDF belgeleri artık varsayılan olarak **Genişlik** modunda açılır: sayfa yatay alana sığdırılır, alt kısmı kaydırarak okuyabilirsin.
- **Tam sayfa** düğmesiyle belgenin tamamını ekrana sığdırma seçeneği korunur.
- Görüntüleme alanı daralıp genişlediğinde mevcut uyarlanabilir ölçekleme çalışmaya devam eder.
- Bu sürüm PDF metni, sayfa bazlı OCR ve yerel OCR mantığını değiştirmez.

### Kurulum (Node.js gerekmez)
1. Aşağıdaki `Turkce-PDF-OCR-Chromium-v0.3.2.zip` paketini GitHub Releases'tan indirip sabit bir klasöre çıkar.
2. `vivaldi://extensions` adresinde **Geliştirici modu** açıkken mevcut yüklenmiş eklenti klasörünü kullan.
3. ZIP'teki **Eklenti** klasörünün tüm içeriğini (vendor dahil), mevcut **aynı Eklenti** klasörünün üzerine kopyala.
4. Eklenti kartındaki **Yeniden yükle** düğmesine bas, açık PDF sekmelerini yenile.

**Not:** Ayrı bir ikinci eklenti yükleme. GitHub ZIP'i kendi kendine güncellenmez. Chromium tabanlı diğer tarayıcılarda uçtan uca uyumluluk testleri halen tamamlanmamıştır. Resmî evraklardaki kritik bilgileri PDF'nin aslıyla karşılaştır.
