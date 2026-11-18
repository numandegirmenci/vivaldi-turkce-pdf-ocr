# Gizlilik (Beta)

- OCR işlemi ve PDF render işlemi, kullanıcının tarayıcısında yerel olarak gerçekleştirilmek üzere tasarlanmıştır.
- PDF içeriği, uygulamamız tarafından bir üçüncü taraf OCR servisine gönderilmez; hesap veya analiz altyapımız yoktur.
- Kullanıcı bir PDF bağlantısı açtığında, eklenti **PDF kaynağından** belgeyi yeniden almak için ağ isteği gönderir. Bu, belgeyi sunan siteyle normal ağ iletişimidir; oturum çerezleri o siteye iletilebilir.
- Eklenti geniş `http://*/*` ve `https://*/*` izinleri ister; amacı farklı web sitelerindeki PDF bağlantılarını tanımak ve açmaktır. Bu izinler potansiyel olarak hassastır, çünkü tarayıcıda birçok siteye erişim sağlar.
- Eklenti bir kullanıcı hesabı istemez ve kendi sunucusuna PDF içeriği, izleme veya telemetri göndermez.
- Kurulum esnasında npm paketleri ve Türkçe OCR modeli üçüncü taraf kaynaklardan indirilir; bu işlem PDF içeriklerinden bağımsızdır.
- Yerel depolamada (`chrome.storage.local`) PDF bağlantılarının otomatik açılıp açılmayacağını belirleyen ayar saklanır.
- Henüz bağımsız bir güvenlik denetimi yapılmamıştır; bu açıklama yalnızca kaynak kodunun mevcut davranışını özetler. Kurumsal ve hassas belgelerde kuruluş politikalarına uyulmalıdır.

## v0.4.0 ek notlar
Arama, kopyalama, OCR ve aranabilir PDF oluşturma tarayıcı içinde yerel olarak yürütülür. Aranabilir PDF kaydında font PDF içine gömülür, dosya harici OCR servisine gönderilmez. Kullanıcı Windows'taki `KOLAY_GUNCELLE.cmd` dosyasını çalıştırırsa GitHub API ve resmi Release ZIP'i indirilir; belgeler Github'a yüklenmez.

## WhatsApp Web (v0.5.0)
WhatsApp Web'deki PDF aktarımı kullanıcı tarafından etkinleştirilen kısa süreli bir işlevdir. Yalnız `web.whatsapp.com` sayfasında çalışacak içerik betikleri vardır. Mesaj ve kişi listesi okunmaz. Yalnız kullanıcı düğmeye bastıktan sonra açtığı PDF'nin ham baytları tarayıcı eklentisine geçici olarak aktarılır; OCR yerel gerçekleştirilir. Parçalar tarayıcı eklentisinin geçici IndexedDB deposundan görüntüleyiciye alınıp silinir; terk edilen aktarım verileri süre aşımıyla temizlenir. Dosyalar GitHub'a veya uygulamanın ayrı bir sunucusuna gönderilmez.

## v0.5.1 son belgeyi yeniden açma
Başarılı PDF yakalamasından sonra son dosyanın kopyası yalnız açık WhatsApp Web sekmesinin geçici belleğinde en fazla 5 dakika tutulur. Bu veri başka bir dosya veya servise otomatik kaydedilmez; sayfa yenilendiğinde veya süre dolduğunda bırakılır. Son PDF düğmesi kullanıcı isteğiyle tekrar aktarım yapar.

## v0.5.8 WhatsApp dosya geçmişi bilgilendirmesi
WhatsApp Web belge yakalaması kullanıcı tarafından etkinleştirildiğinde çalışır. Başarıyla yakalanan belgelerin geçici kopyaları, yeniden açabilmek için aynı WhatsApp sekmesinin belleğinde en fazla **5 dosya / toplam 64 MB** sınırıyla tutulabilir. Geçici aktarım parçaları uzantının yerel IndexedDB deposunda işlenir ve açılış sonrası veya süre aşımında silinir. Kalıcı bulut yüklemesi veya WhatsApp sohbet geçmişinin otomatik taranması amaçlanmaz. Eklentinin yetkilerinin kapsamı ve gerçek erişim davranışı ayrıca incelenmelidir.
