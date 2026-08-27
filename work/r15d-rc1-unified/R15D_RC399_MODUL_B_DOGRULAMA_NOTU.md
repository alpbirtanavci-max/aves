# R15D-rc3.9.9 — Modül B form seti doğrulama notu

Tarih: 27.08.2026

## Esas alınan AVES kaynağı

Ana matris: **ÜB.TB.05 Modüllere Göre Denetim Dosya Seti Tablosu R.02 / 31.03.2026**.

Drive'daki `MODÜL B FORM SETİ` klasörü ile `gereklilik durumunda kullanılacak formlar` alt klasöründeki belgeler tek tek envanterlenmiştir.

## Modül B dosya setinin işlevsel grupları

### 1. Planlama ve tarafsızlık belgeleri

- ÜB.FR.32 Personel Atama/Beyan Formu
- ÜB.FR.30 Tetkik Ekibi Atama Planı ve Denetim Çevrim Programı
- ÜB.LS.14 Denetim Katılımcılar ve Açılış-Kapanış Listesi

Bu belgeler saha checklist maddesi değildir; planlama ve dosya yönetimi sürecinde tutulur.

### 2. Teknik dosya ve tasarım incelemesi

- ÜB.FR.34 Teknik Dosya Değerlendirme Formu
- ÜB.FR.35 Asansör Tasarım Hesapları Kontrol Formu
- ÜB.FR.47 Elektrikli Asansör Tasarım Doğrulama Formu
- ÜB.FR.48 Hidrolik Asansör Tasarım Doğrulama Formu
- ÜB.FR.49 Risk Analizi Formu (varsa)
- ÜB.FR.50 Asansör Yönetmeliği Ek-I Temel Sağlık ve Güvenlik Gerekleri Listesi
- ÜB.LS.23 Firma Tip Beyanı ve Varyasyon Listesi
- ÜB.FR.37 AB Uygunluk Beyanları ve Tip Sertifikaları Kontrol Formu

Bu grup ofis/teknik dosya incelemesidir. AVES Saha uygulamasında her belgeyi ayrı saha maddesine dönüştürmek doğru değildir.

### 3. Model asansörün saha incelemesi

- ÜB.FR.38 TS EN 81-20 Test Kontrol Formu
- ÜB.FR.65 Teknik Dosya-Saha Eşleşme Formu
- ÜB.RP.14 AB Tip İnceleme Raporunun model asansör ve varyant uyumluluğu bölümleri
- Tasarıma göre uygulanabilir ÜB.FR.40/41/42/43/57/58/62/63 formları

Uygulamadaki Modül B denetimi bu grubu temsil eder. Ana saha formu ÜB.FR.38'dir. Ana tip, tip varyant kodu, yük, hız, kapasite, durak, askı ve saha seri numaraları denetim kaydında korunur. Uygulanabilir ek standartlar ana standarttan ayrı değerlendirilir.

### 4. Uygunsuzluk ve takip

- ÜB.RP.06 Uygunsuzluk Raporu
- ÜB.RP.07 Uygunsuzluk Kapatma Bilgi Raporu
- ÜB.FR.53 Takip Muayene Kontrol Formu
- ÜB.RP.14 sonuç ve uygunsuzluk takip bölümü

**Karar:** Modül B'de takip muayenesi vardır ve uygulamada korunacaktır. Ancak ÜB.FR.53 yalnız ilk muayenede tespit edilen uygunsuzlukların mevcut durumunu izler. Bu nedenle:

- Uygunsuzluğu olmayan tamamlanmış Modül B denetiminde takip muayenesi açılamaz.
- Modül B takip denetimine yalnız önceki `Uygun Değil` satırları aktarılır.
- Önceki denetim değişmez; takip T1/T2 zinciriyle ayrı kayıt olarak tutulur.
- Modül G'nin mevcut tam takip davranışı değiştirilmez.

### 5. Sonuç ve dosya kapanışı

- ÜB.LS.11 AB Tip İnceleme Belgesi Eki Listesi
- ÜB.RP.14 AB Tip İnceleme Raporu
- ÜB.FR.16 Müşteri Memnuniyet Anketi
- ÜB.FR.54 Hasar Tutanak Formu (gerektiğinde)
- ÜB.FR.55 İş Emniyet Tutanağı (gerektiğinde)

## Bu sürümün kapsam sınırı

R15D-rc3.9.9, Modül B'nin **mobil saha denetimi ve takip veri akışını** düzeltir. Bütün resmî Modül B dosya paketini PDF/DOCX olarak otomatik üretme iddiasında değildir.

Henüz ayrı çıktı üretimi bulunmayan başlıca belgeler: ÜB.FR.53, ÜB.RP.06, ÜB.RP.07 ve ÜB.RP.14. Bunlar form çıktıları projesinde ayrıca, kendi revizyonları kilitlenerek ele alınmalıdır.

TS EN 81-21, 81-22, 81-28 ve 81-77 içerikleri kütüphanede tam madde seti hâline getirilmeden uygulama bunları varmış gibi göstermemelidir. Bu formlar gelecekte kaynak form bazlı içerik çalışması olarak eklenmelidir.
