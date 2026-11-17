## Türkçe PDF OCR v0.4.0 — Toplu özellik sürümü (Beta)

Tek pakette:
- PDF açılışında varsayılan **Genişlik** modu.
- Ctrl+F/F3 araması, bulunan sayfaları işaretleme; taramalar için bütün sayfaları hazırlama.
- Görünür sayfayı önce yükleme, düşük bellek için canvas sınırı, uzun PDF performans iyileştirmeleri.
- Form/tablo sayfalarında seçilebilir kontrast ve OCR sayfa bölümleme modu.
- OCR kelimelerinden satır/sütun aralığı korumaya çalışan kopyalama.
- J/K sayfa, +/- yakınlaştırma, 0/1 görünüm, Ctrl+S PDF kaydı.
- Sayfa numarası gezgini ve 90° döndürme.
- Orijinal PDF üzerine görünmez, Türkçe Unicode OCR metni ekleyen **Aranabilir PDF** kaydı.
- Windows için `KOLAY_GUNCELLE.cmd` ile yedekleyerek güncelleme yardımcısı.

### Kurulum
1. Releases > Assets içinden `Turkce-PDF-OCR-Chromium-v0.4.0.zip` indirin.
2. Dosyaları sabit klasöre çıkarın. `vivaldi://extensions` → Geliştirici modu → Paketlenmemiş öğe yükle → `Eklenti` klasörü.
3. Eski kurulum varsa aynı klasörün içeriğini yenileyin ve uzantı kartında **Yeniden yükle** yapın. İkinci kopya kurmayın.
4. Sonraki sürümlerde paket yanındaki `KOLAY_GUNCELLE.cmd` yardımcı olabilir; tarayıcıda yeniden yükleme yine gereklidir.

### Uyarılar
- BETA: Gerçek Vivaldi uçtan uca testleri, büyük resmî belge ve PDF dönüşümleri ayrıca sınanmalıdır.
- Gelişmiş OCR her belgeyi daha doğru okuyacağı anlamına gelmez. Karmaşık tablolar hata yapabilir.
- PDF'ye metin katmanı eklemek elektronik imzayı bozabilir; orijinal belgenizi saklayın.
- GitHub'daki paketlenmemiş eklenti **otomatik güncellenmez**.
