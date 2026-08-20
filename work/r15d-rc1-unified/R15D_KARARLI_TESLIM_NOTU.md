# AVES Saha R15D — Kararlı Sürüm Teslim Notu

Hazırlanma tarihi: 19 Ağustos 2026

## Kapsam

- Saha akışı üç sonuçla çalışır: Uygun, Uygun Değil ve Uygulanmaz.
- Denetimler çevrimdışı başlatılabilir, düzenlenebilir ve bağlantı geldiğinde değişiklik bazında senkronize edilir.
- Her bölüm tamamlandığında sıradaki fiziksel bölüme geçilir; kalıcı Denetimi Bitir düğmesi ilk açık maddeye yönlendirir.
- Seri numaraları bölge bazında ve denetimin her aşamasından erişilebilir şekilde tutulur.
- TS EN 81-71 ve TS EN 81-73 maddeleri özel bölüm yerine fiziksel saha bölümlerine dağıtılır.
- TS EN 81-72 yalnız İtfaiyeci Asansörü seçimiyle denetime dahil edilir.
- Teknik müdür sistem içeriğini değiştiremez; inceleyebilir ve yetkisi kapsamında denetim silebilir.
- İnceleme Modu bütün maddelere arama ve filtrelerle salt okunur erişim sağlar.

## Canlı veri doğrulaması

- Aktif 81-71 maddesi: 39.
- Aktif 81-73 maddesi: 31.
- Eski 08/09 özel bölümlerinde aktif madde: 0.
- Mükerrer denetim/madde cevabı: 0.
- Sahipsiz checklist satırı: 0.
- Boş veya geçersiz seri numarası nesnesi: 0.
- Denetimler, checklist, kütüphane ve profil tablolarında RLS etkin.
- Anonim saha tablosu yetkisi: 0.
- Denetçi checklist silme yetkisi: 0.

## Doğrulama

- JavaScript ve Service Worker sözdizimi kontrolleri geçti.
- Statik/regresyon kontrolleri: 171/171 geçti.
- Canlı özel alan adı, uygulama kabuğu ve güvenlik eşleme dosyası hatasız yüklendi.
- Yeni denetimde 08 ve 09 özel bölümlerinin oluşmadığı saha testiyle doğrulandı.
- İnceleme Modu'ndaki sonuç ve bulgu butonları dokunmatik cihazlarda da salt okunur olduklarını açıkça gösterecek şekilde pasifleştirildi; seçilmiş sonuç görünür tutuldu.

## Tarihsel denetimler

Başlamış denetimler oluşturuldukları andaki madde kopyasını korur. Kütüphane içerik veya bölüm değişiklikleri başlamış denetimleri sessizce yeniden yazmaz.

Kararlı sürüm üretime gönderilmeden önce paralel kabul testi bulguları bu notla karşılaştırılmalıdır.
