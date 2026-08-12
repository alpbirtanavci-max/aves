# Claude Code için AVES Saha Denetim Projesi Ana Brifi

Bu metni yalnızca bir özellik listesi olarak değil, projenin amacı, sınırları, kaynak disiplini, mimari kararları, düzeltilmiş hataları ve bundan sonraki çalışma yöntemini tanımlayan bağlayıcı bir proje brifi olarak kabul et.

## 1. Rolün ve ilk görevin

Sen, AVES Saha Denetim uygulamasını devralan kıdemli yazılım mimarı, veri güvenliği sorumlusu ve teknik içerik kalite denetçisi gibi çalışacaksın. Ancak asansör uygunluk veya belgelendirme kararını veren kişi değilsin. Yazılım, denetçiye yardımcı olan operasyonel bir araçtır; mevzuatın, standardın, AVES kontrollü dokümanlarının, teknik düzenleme sorumlusunun veya yetkili karar merciinin yerine geçemez.

İlk işin yeni özellik yazmak değildir. Önce mevcut çalışma alanını, sürümü, veri modelini, migration geçmişini, testleri ve kaynak kayıtlarını incele. Kodda veya canlı sistemde değişiklik yapmadan önce mevcut durumun kısa fakat kanıta dayalı envanterini çıkar. Bir çelişki görürsen tahminle çözme; “doğrulanması gereken karar” olarak kaydet.

Canlı Supabase veya Cloudflare üzerinde işlem yapma yetkisi bu metinle verilmiş değildir. Canlı değişiklik ancak kullanıcı açıkça istediğinde yapılabilir. Canlı çalışma istendiğinde de önce salt okunur inceleme, yedek, prova, transaction, doğrulama ve geri dönüş planı zorunludur.

## 2. Projeyi neden yapıyoruz?

AVES, asansör uygunluk değerlendirme ve ürün belgelendirme faaliyetlerinde sahadaki kontrolün daha güvenilir, izlenebilir, hızlı ve eksiksiz yürütülmesini amaçlıyor. Uygulamanın temel varlık nedeni “kağıdı telefona taşımak” değildir. Amaç:

- Denetçinin yüzlerce kontrol maddesi arasında madde atlamasını önlemek.
- Asansörün fiziksel kontrol sırasına uygun, adım adım ve hızlı bir saha akışı sağlamak.
- Teknik dosya, beyan edilen değer, saha ölçümü, gözlem ve kontrollü kaynak arasındaki bağı görünür kılmak.
- İnternet olmayan kuyu dibi, bodrum ve betonarme yapılarda dahi çalışmayı kesintisiz sürdürmek.
- Denetçinin verdiği hiçbir cevabın sessizce kaybolmamasını sağlamak.
- Hangi kontrolün hangi doküman, revizyon, standart maddesi veya AVES kriterinden geldiğini sonradan açıklayabilmek.
- Saha kaydı ile resmi uygunluk değerlendirme/belgelendirme kararını bilinçli şekilde birbirinden ayırmak.
- Denetçiye öneri ve bağlam sunmak, fakat onun yerine karar vermemek.

Bu projede güven, özellik sayısından önemlidir. Kağıt form çökmemesi, bağlantı istememesi ve elde gözle taranabilmesi nedeniyle denetçi için güçlü bir güven referansıdır. Dijital sistem bir defa “kaydedildi” deyip cevabı kaybederse saha ekibi tekrar kağıda dönebilir. Bu nedenle her tasarım kararında şu soruyu sor:

> Bu değişiklik sahadaki mühendisin güvenini artırıyor mu, yoksa görünmeyen yeni bir risk mi oluşturuyor?

Uygulama kağıttan daha az güvenilir hissedemez. Ayrıca kağıdın yapamadığını yapmalıdır: geçmiş denetimi göstermek, ölçümü referansla karşılaştırmak, teknik dosya ile sahayı eşlemek, eksik maddeleri bulmak ve verinin cihaz/sunucu durumunu dürüstçe göstermek.

## 3. Ürünün kesin sınırı

AVES Saha şu değildir:

- Otomatik uygunluk kararı motoru değildir.
- Belge verilir/verilmez kararı üretmez.
- Standardın veya mevzuatın yerine geçen bağımsız norm kaynağı değildir.
- AVES kontrollü formlarının hukuki/kurumsal statüsünü kendiliğinden değiştirmez.
- Yapay zekâ ile teknik hüküm uyduran sistem değildir.
- “Uygun Değil” işaretinin tek başına nihai belgelendirme kararı olduğunu varsaymaz.

AVES Saha şudur:

- Denetim hazırlığı, saha kontrolü, ölçüm, açıklama, kaynak gösterimi, gözden geçirme ve güvenli veri aktarımı sağlayan operasyonel yardımcı sistemdir.
- Denetçiye ölçüm eşiği veya olası sonuç önerisi gösterebilir; sonuç düğmesine kendiliğinden basmamalıdır.
- Kaynağı doğrulanmış konfigürasyon kurallarıyla maddeleri otomatik “Uygulanmaz” ön işaretleyebilir; bu işlem görünür, gerekçeli ve gerektiğinde yetkili mühendis tarafından değiştirilebilir olmalıdır.
- Resmi sürece veri hazırlayabilir; resmi karar katmanının yerine geçmez.

Kodda `APPROVED`, `CERTIFIED`, `CONFORMITY_DECISION` gibi saha uygulamasının yetkisini aşan durumlar üretme. Kullanıcıya gösterilen dil de bu sınırı korumalıdır.

## 4. Kaynak hiyerarşisi ve bilgi disiplini

Bu proje için en önemli çalışma kurallarından biri kaynakların birbirine karıştırılmamasıdır. Her teknik hüküm aşağıdaki sınıflardan birine açıkça yerleştirilmelidir:

1. Mevzuat ve resmi düzenleyici kaynak: Asansör Yönetmeliği (2014/33/AB), ilgili Bakanlık/ONTEK yayımları ve geçerli resmi düzenlemeler.
2. Akreditasyon ve uygunluk değerlendirme çerçevesi: TÜRKAK kapsamı ve ISO/IEC 17065 temelli kurumsal gereklilikler.
3. Avrupa uygunluk değerlendirme bağlamı: 2014/33/EU, harmonize standart listeleri ve NANDO kapsam/atama bilgileri.
4. Yetkili standart metni: TSE veya yetkili kaynaktan temin edilen geçerli baskı/revizyon.
5. AVES kontrollü dokümanı: onaylı prosedür, form, rapor, talimat ve ana doküman listesi.
6. Kontrollü taslak: henüz onaylı doküman olmayan, açıkça “KONTROLLÜ TASLAK” statüsünde çalışma.
7. Tasarım inceleme / mühendislik değerlendirmesi: kaynağı ve statüsü açık teknik yorum.
8. Saha rehberi: resmi gerekliliği açıklayan uygulama yönlendirmesi; yeni norm koyamaz.

Kaynaklar arasında çelişki varsa kendi başına “en mantıklı” olanı seçme. Geçerli revizyonu, doküman statüsünü ve yetkili kaynağı doğrula. Sonucu bir kaynak kayıt tablosunda göster. Dosya adında “R.04” yazması tek başına onun yürürlükte olduğunu kanıtlamaz; AVES ana doküman listesi ve onay durumu da kontrol edilmelidir.

Bir madde için ideal kaynak alanları şunlardır:

- `criterion_type`
- `source_document_id`
- `source_document_code`
- `source_document_revision`
- `source_clause`
- `standard_code`
- `standard_edition`
- `source_status`
- `verified_at`
- `verified_by`

Mevcut modeldeki `kaynak_turu`, `kaynak_form_kodu`, `kaynak_form_revizyonu`, `standart_madde_no`, `resmi_madde_metni`, `denetci_yonlendirmesi` ve `aranmaz_kosulu` alanlarını bu disipline uygun değerlendir.

Özellikle şu dört şeyi aynı metin alanına doldurma:

- Resmi/teknik gereklilik
- Saha uygulama rehberi
- Uygulanmazlık koşulu
- Uygulamanın kendi iç notu

Ekran ve veri modelinde bunlar ayrı olmalıdır:

- Madde/gereklilik: neyin sağlanması gerektiği.
- AVES saha rehberi: denetçinin bunu sahada nasıl kontrol edeceği.
- Uygulanmaz koşulu: hangi teknik durumda bu kontrolün uygulanmayacağı.
- Açıklama: denetçinin bu denetime özgü serbest notu.

Saha rehberi gereklilik metnini aynen tekrar etmemelidir. “Uygulanmaz/Aranmaz” cümlesi madde veya rehberin sonunda tekrar edilmemeli, yalnız `Uygulanmaz koşulu` alanında görünmelidir. “Uygulamada fotoğraf saklanmaz” gibi uygulamanın kendi çalışma notları teknik saha rehberine yazılmamalıdır.

## 5. Başlıca standart ve kontrollü doküman evreni

Proje şu teknik ve kurumsal kaynaklardan beslenmektedir. Baskı ve yürürlük durumu her zaman yetkili kaynaktan yeniden doğrulanmalıdır:

- Asansör Yönetmeliği (2014/33/AB) ve dayandığı 2014/33/EU Asansör Direktifi.
- TS EN 81-20: insan ve yük taşıyan asansörlerin yapım ve montajına ilişkin güvenlik kuralları.
- TS EN 81-50: asansör bileşenlerinin tasarım kuralları, hesapları, inceleme ve deneyleri.
- TS EN 81-70: engelliler dahil kişiler için erişilebilirlik.
- TS EN 81-71: kasıtlı tahribata dayanıklı asansörler.
- TS EN 81-72: itfaiyeci asansörleri.
- TS EN 81-73: yangın anında asansörlerin davranışı.
- TS EN 81-28: yolcu ve yük asansörlerinde uzaktan alarm.
- TS EN 81-21: mevcut binalarda yeni yolcu/yük asansörleri.
- TS EN 81-22: eğik düzlemde çalışan elektrikli asansörler.
- TS EN 81-77: sismik şartlara tabi asansörler.
- TS EN ISO 13857: tehlikeli bölgelere üst ve alt uzuvlarla erişmeyi önleyen güvenlik mesafeleri.
- ISO/IEC 17065: ürün, proses ve hizmet belgelendirmesi yapan kuruluşlar için şartlar.

Standart metinleri telifli olabilir. Yetkisiz web kopyalarını norm kaynağı olarak kullanma ve bütün standardı kaynak koda gömme. Kullanıcının yetkili olarak eriştiği Drive kopyaları çalışma referansı olabilir; yine de baskı, dil, değişiklik ve yürürlük statüsünü TSE/harmonize standart listesi üzerinden doğrula.

AVES tarafında özellikle aşağıdaki kontrollü dokümanlar kaynak eşleme ve süreç açısından önemlidir:

- ÜB.PR.10 — Asansör Yönetmeliği uygunluk değerlendirme prosedürü ve belgelendirme programı.
- ÜB.FR.34 — Teknik dosya değerlendirme formu.
- ÜB.FR.35 — Asansör tasarım hesapları kontrol formu.
- ÜB.FR.37 — AB uygunluk beyanları ve tip sertifikaları kontrol formu.
- ÜB.FR.38 — TS EN 81-20 test kontrol formu.
- ÜB.FR.39 — TS EN 81-1/2+A3 test kontrol formu.
- ÜB.FR.40 — TS EN 81-72 itfaiyeci asansörleri kontrol formu.
- ÜB.FR.41 — TS EN 81-71 kasıtlı tahribata dayanıklılık kontrol formu.
- ÜB.FR.42 — TS EN 81-73 yangın anında davranış kontrol formu.
- ÜB.FR.43 — TS EN 81-70 erişilebilirlik kontrol formu.
- ÜB.FR.50 — Asansör Yönetmeliği Ek-I temel sağlık ve güvenlik gerekleri listesi.
- ÜB.FR.57 — TS EN 81-22 kontrol formu.
- ÜB.FR.58 — TS EN 81-77 kontrol formu.
- ÜB.FR.62 — TS EN 81-28 uzaktan alarm kontrol formu.
- ÜB.FR.63 — TS EN 81-21 kontrol formu.
- ÜB.FR.65 — Teknik dosya-saha eşleşme formu.
- ÜB.FR.47/48 — elektrikli/hidrolik asansör tasarım doğrulama formları.
- ÜB.RP.15 — Modül G birim doğrulaması muayenesi sonuç raporu.

## 6. Kullanıcının Drive kaynakları

Bu bağlantılar kullanıcının özel Drive alanındadır. Erişimin varsa salt okunur incele; paylaşım yetkisini değiştirme, taşımama, silme veya yeniden adlandırma yapma.

- AVES ana klasörü: https://drive.google.com/drive/folders/1VspPboXQMbZnfOHJgO3obz5V-6fMIv1H
- AVES 17065 kalite yönetim sistemi temel dokümantasyonu: https://drive.google.com/drive/folders/1U07EFO8InDJC7v1hIavuJYgr3hnNEo3b
- AVES ÜB formlar ve raporlar: https://drive.google.com/drive/folders/1NLX7rsl1aNG0eM1NEvKf0eV9ycg0YYwM
- AVES ÜB ana dokümanlar: https://drive.google.com/drive/folders/1YpUimtaz_Q314YrGOKZDUuRGfhU6O8tE
- AVES ÜB talimatlar: https://drive.google.com/drive/folders/1HVPeN7fKwUDQyERIJw9JeD3H5qGpsVMM
- ÜB.PR.10 PDF: https://drive.google.com/file/d/11BGV0Z-h8M6sJc0FVWXsTxZvpV_X13CQ/view
- ÜB.FR.37 PDF: https://drive.google.com/file/d/1uh7yZC_mRedVbMmZc-Y3Yv7TWiROG4Na/view
- ÜB.FR.38 R.04 PDF: https://drive.google.com/file/d/1NqM263dcLGfRjwJsEmnxNKyT2TRGaPuR/view
- ÜB.FR.39 R.02 PDF: https://drive.google.com/file/d/1r_1R8YnIeHHAm6sbwaZVvA-Kz53tOxuG/view
- ÜB.FR.40 R.04 PDF: https://drive.google.com/file/d/11RsaIMG1olVR99EiGWhPdQSe6Gx-icLP/view
- ÜB.FR.41 R.04 PDF: https://drive.google.com/file/d/1EwGt-_Msaq9pWXFpdt2vAHLMj9nNmyNp/view
- ÜB.FR.42 R.04 PDF: https://drive.google.com/file/d/19r88NsxtT-A74o4IIGRfPRWAKvUHRLmL/view
- ÜB.FR.43 R.04 PDF: https://drive.google.com/file/d/1MgcyUWIQfRAl2VpTMsInsXAJyeL621le/view
- ÜB.FR.50 R.01 PDF: https://drive.google.com/file/d/1kmgsmPMxdHYb6rnSb8Yr8-EroGvYBlO4/view
- ÜB.FR.57 R.03 PDF: https://drive.google.com/file/d/1q6FA0S47xAq2n7QywbCLI-fmoyGX-Q2N/view
- ÜB.FR.58 R.01 PDF: https://drive.google.com/file/d/1v6ucJHHKUGO_-Goa-Rn3ZGH1WVV3JAqH/view
- ÜB.FR.62 R.03 PDF: https://drive.google.com/file/d/1YK6GHoaH3g3mTtJT0OWKYNKbDwOKb31F/view
- ÜB.FR.63 R.04 PDF: https://drive.google.com/file/d/13mTBkzXbXTl9TdZjZi0nNTY8ybaRM6u3/view
- ÜB.FR.65 PDF: https://drive.google.com/file/d/1VtlG-SNRX2tHjOs7WjmlCIeLmiBaeqQL/view
- ÜB.RP.15 R.01 PDF: https://drive.google.com/file/d/18rtb-Mxn7jgXg22t-zR3eVW59XACQueQ/view
- EN 81-20:2020 çalışma kopyası: https://docs.google.com/document/d/1JcSOCOrOXWb3kK9MaCpuZU96ZL1eYXLQ/edit
- BS EN 81-50:2014 çalışma kopyası: https://drive.google.com/file/d/18DylA5jIsq8eWLcXR1kWfnjT6AQZmhdb/view
- BS EN 81-72:2015 çalışma kopyası: https://drive.google.com/file/d/11CPo7AiuQAeW2ZbBJIaSR0pZQli3ysGd/view
- TS EN ISO 13857:2019 çalışma kopyası: https://drive.google.com/file/d/1BjSeustfjUeajuZfouy9x6Ue3N0i1Uyj/view

Bu bağlantıların varlığı, dosyaların otomatik olarak güncel/yürürlükte/onaylı olduğu anlamına gelmez. Önce ana doküman listesi, revizyon ve onay statüsü doğrulanmalıdır.

## 7. Mevcut teknik mimari

Mevcut sistem ağır bir framework kullanmayan, mobil odaklı bir PWA’dır:

```text
Cloudflare Pages / özel alan adı
        ↓ uygulama kabuğu
Supabase Auth + PostgreSQL + REST/RLS
        ↕
Tarayıcı IndexedDB
        ↓
Kalıcı outbox ve güvenli senkronizasyon
```

Temel sorumluluk dağılımı:

- Cloudflare Pages: statik arayüz, PWA kabuğu, güvenlik başlıkları ve sürüm dağıtımı.
- Supabase Auth: kullanıcı kimliği.
- Supabase PostgreSQL: kullanıcı profilleri, kontrollü madde kütüphanesi, denetimler, saha cevapları ve bölüm sürümleri.
- Supabase RLS: satır düzeyinde yetki.
- IndexedDB: çevrimdışı denetim, kütüphane, cihazdaki cevaplar ve kalıcı outbox.
- Service Worker: yalnız uygulama kabuğu ve gerekli referans görselleri için offline cache.

Frontend’e yalnız public/anon key girebilir ve güvenlik RLS ile sağlanır. `service_role`, veritabanı parolası veya yönetici sırrı hiçbir zaman uygulama paketine, Service Worker’a, ZIP’e veya repoya girmemelidir.

Madde kütüphanesi Cloudflare paketinde statik JSON olarak yayımlanmamalıdır. Kullanıcı giriş yaptıktan sonra Supabase/RLS üzerinden sayfalı biçimde indirilir, tamlığı manifest/hash ve beklenen sayıyla doğrulanır, ardından IndexedDB’ye atomik olarak alınır. 1000 satırlık API limitine karşı pagination zorunludur. Yarım kütüphane hiçbir zaman “hazır” kabul edilmemelidir.

Fotoğraf ve video şu an uygulamaya yüklenmez. Denetçi AVES’in harici kayıt yöntemiyle ilerler. Bu bilgi her teknik maddenin sonunda tekrarlanmamalıdır. Gelecekte medya uygulamaya alınırsa private bucket, immutable evidence kaydı, hash, erişim politikası ve kesintili/resumable yükleme tasarımı yapılmadan eklenmemelidir.

## 8. Mevcut otoriter çalışma alanı ve sürüm durumu

Eski “R15C” adı iki farklı paket için kullanılmıştır; bu nedenle yalnız sürüm adına güvenme. Claude tarafından üretilen eski R15C paketi ile ChatGPT tarafında geliştirilen R15C/R15D çizgisi aynı değildir.

Bu çalışma ortamında esas alınacak birleşik kaynak:

`work/r15d-rc1-unified/`

Önemli dosyalar:

- `app/` — güncel uygulama kaynakları.
- `database/21_r15d_guvenli_gecis.sql` — tarihsel kaydı silmeden yapılan ana R15D geçişi.
- `database/22_r15d_rc2_saha_akisi_ve_kuyu_dibi.sql` — kullanıcı saha geri bildirimi ve kütüphane kalite düzeltmeleri.
- `database/00_r15d_canli_on_kontrol.sql` — salt okunur canlı envanteri.
- `data/madde_kutuphanesi.json` ve CSV — kontrollü geliştirme kaynakları; Cloudflare paketine girmez.
- `tests/` — statik, migration, mock Supabase ve offline smoke testleri.
- `qa/` — kütüphane kalite raporları.
- `backups/` — hassas canlı yedekler; yayın paketine veya üçüncü taraf arşivine girmez.

Uygulama kaynaklarındaki güncel build etiketi `R15D-rc2.3`’tür. En son paket:

`work/r15d-rc1-unified/release/AVES_Saha_R15D_rc2_3_20260811.zip`

SHA-256:

`9D44C48B835E1F09C656C274B9F0019EA42B3C390BFF46CED560D1E1AF804495`

Supabase proje kimliği: `jmccmkqyncunpqliqvox`.

11 Ağustos 2026 tarihinde güvenli yedek şeması `aves_backup_r15d_rc2_20260811` oluşturulmuş ve R15D-rc2 migration uygulanmıştır. Son doğrulamada temel sayılar: 6 profil, 1.019 kütüphane satırı, 11 bölüm sürümü, 2 denetim ve 0 saha cevabıydı. Bu sayıları yeni çalışmada tarihsel gözlem olarak kabul et; canlı işlem öncesinde yeniden say.

Cloudflare Pages projesi `aves-saha`dır. Son production deployment kimliği `52a19a49` ve build `R15D-rc2.3` olarak doğrulanmıştır. Ancak Türkiye’den `*.pages.dev` alanına HTTPS bağlantısı sıfırlanmakta, eski cihazlar zaman zaman yalnız cache’teki R15D-RC1’i göstermektedir. Bu nedenle production dağıtımı için özel alan adı bağlamak P0 konusudur. Tekrar tekrar deploy etmek erişim engelini çözmez.

## 9. Kesinleşmiş ürün ve saha akışı kararları

### 9.1 Sonuçlar yalnız üçlüdür

Denetçinin nihai checklist sonucu yalnız:

- Uygun
- Uygun Değil
- Uygulanmaz

olmalıdır. Veritabanındaki mevcut teknik karşılıklar sırasıyla `Kontrol tamamlandı`, `Olumsuz bulgu`, `Uygulanmaz` olabilir; kullanıcıya resmi ve anlaşılır etiketler gösterilir.

“Kontrol edilemedi”, “Veri eksik” veya “Eksik” yeni bir saha sonucu değildir. AVES yaklaşımına göre her madde sonuçlandırılmalıdır. Sonuç verilmemiş madde boş/cevapsızdır ve denetimin kapanmasını engeller. Kullanıcı “Eksik” düğmesine basmaz; sistem hangi maddelerin boş olduğunu kendisi bulur.

Eski sürümdeki `Veri eksik` kayıtları silinmez. Migration bunları tarihsel iç kontrol notu olarak korur ve üçlü sonuçtan biriyle yeniden değerlendirilmesini ister. Ancak yeni denetimde seçilebilir “geçici iç işaret” oluşturma. Kullanıcının son kararı nettir: yeni bir iç işaret kontrolüne gerek yoktur; yalnız opsiyonel madde açıklaması yeterlidir.

### 9.2 Açıklama opsiyoneldir

Uygun Değil seçildiğinde hazır bulgu veya açıklama zorunlu değildir. Denetçi isterse hazır bulgu seçer veya serbest açıklama yazar. Açıklama alanı bütün maddelerde kalabilir ve kalem simgesiyle açılabilir. Zorunluluk ancak AVES’in kontrollü dokümanı açıkça gerektiriyorsa ayrıca tanımlanmalıdır; geliştirici kendi başına zorunluluk eklememelidir.

### 9.3 Wizard ve bölüm akışı

- Ekranda varsayılan olarak tek madde bulunur.
- Sonuç verildiğinde yerel transaction tamamlandıktan sonra sıradaki maddeye geçilir.
- Bölüm sonundaki `Bölümü Bitir` işlemi otomatik olarak sıradaki bölümü açmalı ve o bölümdeki ilk cevapsız maddeye götürmelidir.
- Son bölüm tamamlandığında uygulama ilk bölüme dönmemelidir.
- `Denetimi Bitir` butonu her zaman erişilebilir olmalıdır.
- Eksik/cevapsız madde varsa `Denetimi Bitir` doğrudan ilk eksik maddeye götürmelidir.
- Bütün maddeler tamamlanmışsa gözden geçirme/kapanış ekranını açmalıdır.
- Denetçi kapanmadan önce tüm maddeleri kompakt, gözle taranabilir listede görebilmelidir; yalnız toplam sayı yeterli değildir.

### 9.4 Denetim durum makinesi

Mevcut iş akışı:

```text
Devam Ediyor
    ↓
Gözden Geçirme
    ↓
Çalışma Tamamlandı
```

Denetçi `Gözden Geçirme` aşamasında cevapları düzeltebilir. Çalışma tamamlandıktan sonra kendi denetimini tekrar `Gözden Geçirme` durumuna açıp hatasını düzeltebilmesi yönünde mevcut ürün kararı vardır. Yeniden açma ve değişiklik audit edilebilir olmalıdır. Bu akış “belgelendirme onayı” değildir; yalnız saha kaydının çalışma durumudur.

İnternet yokluğu denetimi bitirmeyi engellemez. Uygulama şu iki kavramı ayrı gösterir:

- Saha içeriği bu cihazda tamamlandı.
- Bütün kayıtlar sunucuyla eşitlendi.

### 9.5 Denetim başlangıç alanları

Yeni denetimde en az şu bilgiler doğru ve gerekli alanlarla alınır:

- Müşteri ünvanı
- Adres
- Mühendis/denetçi
- Asansör seri veya kimlik bilgisi
- Beyan yükü
- Beyan hızı
- Kapasite
- Tahrik tipi
- Makine dairesi tipi: MR veya MRL; zorunlu
- Denetim türü/kontrol profili

`Müşteri Ünvanı` inputuna tıklanınca formun kapanıp listeye dönmesi daha önce bulunan kritik UI regresyonudur. Overlay ve event bubbling davranışı için kalıcı regresyon testi bulundur.

Denetim tarihini `toISOString().slice(0,10)` ile UTC’den üretme. Türkiye’de cihazın yerel takvim tarihi kullanılmalıdır.

### 9.6 Otomatik Uygulanmaz

Tahrik tipi, MR/MRL veya doğrulanmış konfigürasyonla uyuşmayan maddeler otomatik Uygulanmaz işaretlenebilir. Ancak:

- Kuralın kaynağı ve sürümü olmalıdır.
- Gerekçe ayrı alanda saklanmalıdır.
- Madde veya rehber metninin sonunda tekrar yazılmamalıdır.
- Denetçi hangi maddelerin neden Uygulanmaz olduğunu görebilmelidir.
- Yetkili mühendis gerektiğinde sonucu değiştirebilmelidir.
- Denetim başlangıç onayında müşterinin yanlış yorumlayabileceği “X madde otomatik uygulanmaz” sayısı özellikle gösterilmez.
- Otomatik Uygulanmaz, kontrolün sessizce yok olması anlamına gelmez; kayıt ve gerekçe denetim snapshot’ında bulunmalıdır.

TS EN 81-71/72/73 gibi özel standartların uygulanabilirlik mantığını kontrollü AVES formu veya açık proje/başvuru verisi olmadan tahmin ederek kodlama. Özel standart maddeleri kontrol profili/denetim kapsamı üzerinden etkinleşmelidir.

### 9.7 Tasarım İnceleme adı

Veride kaynak türü `Ek Mühendislik` olarak kalabilir; kullanıcı arayüzündeki rozet `Tasarım İnceleme` olmalıdır. Bu ad kullanıcı tarafından özellikle tercih edilmiştir.

### 9.8 Fotoğraf yaklaşımı

Fotoğraflar uygulamaya yüklenmiyorsa bunu her maddede tekrar etme. Bölüm sonu fotoğraf kontrol listesi/hatırlatması olabilir; eksik işaretler kapanışı otomatik engellemek zorunda değildir. Fotoğrafın AVES tarafından belirlenen harici kayıt yöntemiyle ilişkilendirilmesi kurumsal süreç kararıdır.

## 10. Offline-first veri güvenliği: projenin kalbi

Bazı binalarda denetçi binaya girmeden formu açacak ve denetim bitene kadar hiç internet gelmeyecektir. Bu bir istisna değil, tasarım girdisidir.

Ana ilke:

> Ağ bağlantısı hız ve paylaşım kazandırır; saha verisinin güvenliğinin şartı değildir.

Her cevapta doğru sıra:

```text
Kullanıcı sonucu seçer
    ↓
cevap + outbox aynı IndexedDB readwrite transaction’ında yazılır
    ↓
transaction başarıyla tamamlanır
    ↓
“Cihaza kaydedildi” gösterilir
    ↓
sonraki madde açılır
    ↓
arka planda yalnız bekleyen değişiklikler Supabase’e gönderilir
```

Uygulama yerel transaction bitmeden sonraki maddeye geçmemelidir. Outbox RAM’de değil IndexedDB’de kalıcı tutulmalıdır. Tarayıcı veya telefon kapanıp açılsa dahi bekleyen işlemler bulunmalıdır.

Kullanıcıya şu durumları dürüstçe ayır:

- `Cihaza kaydedildi`: IndexedDB transaction tamamlandı.
- `Senkronizasyon bekliyor`: cihazda var, sunucuda henüz doğrulanmadı.
- `Sunucuyla eşitlendi`: Supabase isteği başarıyla kabul etti.
- `Çakışma/Yetki incelemesi`: veri cihazda korunuyor, otomatik olarak silinmedi.

Outbox kaydı yalnız sunucu kabulü doğrulandıktan sonra kaldırılır. Timeout, 403, 409 veya ağ hatasında silinmez. Başarısız işlemler artan beklemeyle tekrar denenir; sık ve sonsuz döngü kurulmaz.

`denetim_id + madde_id` benzersiz olmalıdır. Aynı isteğin bağlantı kopması nedeniyle tekrar gönderilmesi mükerrer satır üretmemelidir. İşlem kimliği/idempotency yaklaşımını koru.

Sunucudan gelen eksik listeyi “yerelde olmayanları sil” şeklinde yorumlama. Açık tombstone/silme kaydı olmadan pull işlemi yerel denetimi veya cevabı silemez. Bu hata daha önce bulunmuş ve düzeltilmiştir; regresyon testi zorunludur.

İki cihaz aynı maddeyi değiştirirse 409 durumunda yerel kayıt korunur ve kullanıcıya çatışma gösterilir. Tam optimistic-lock/çakışma çözme protokolü hâlâ geliştirilmesi gereken alandır. “Son yazan kazanır” davranışını sessizce kabul etme.

Tam denetim bitince yerel kopyayı hemen silme. Sunucudaki beklenen madde sayısı ile bulunan cevap sayısı, bekleyen outbox ve çatışmalar doğrulanmadan cihaz kaydı temizlenmemelidir.

## 11. Service Worker ve sürüm güncelleme ilkeleri

Service Worker uygulama kabuğunu çevrimdışı tutmalı, Supabase API yanıtlarını cache’lememelidir. Veri cache’i IndexedDB’dedir.

- Navigasyon çevrimiçiyken network-first, çevrimdışıyken güvenli app-shell fallback olmalıdır.
- Yeni sürüm saha ortasında açık denetimi bozacak şekilde zorla yenilenmemelidir.
- Güncelleme kodu IndexedDB, outbox, localStorage veya denetim verisini asla silmemelidir.
- Eski AVES cache’leri temizlenecekse önce yeni build ağdan `no-store` ile doğrulanmalıdır.
- Güncelleme kurtarma sayfası yalnız aynı origin’e ait AVES Service Worker kayıtlarını ve `aves-saha-` önekli Cache Storage kayıtlarını temizler.
- Ana sayfa, `index.html`, `sw.js`, `update.html` ve `update.js` için uygun `no-store/no-cache` başlıkları kullanılmalıdır.

Eski R15D-RC1’in cache’te görünmesi güncel production deployment’ın başarısız olduğu anlamına gelmeyebilir. Ancak kullanıcıya ulaşmayan sürüm de operasyonel olarak yayınlanmış sayılmaz. Özel alan adı üzerinde temiz cihaz smoke testi yapılmadan yayın kabulü verme.

## 12. Roller, silme yetkileri ve RLS

Roller:

- `muhendis`
- `teknik_mudur`
- `yonetici`

Temel yetki ilkeleri:

- Mühendis kendi denetimini `Devam Ediyor` ve `Gözden Geçirme` aşamalarında düzenleyebilir.
- Teknik müdür ve yönetici kapsamlarındaki denetimleri yönetebilir.
- Mühendis denetim silemez.
- Teknik müdür ve yönetici yanlış açılmış bütün denetimi silebilir.
- Checklist/saha cevap satırı hiç kimse tarafından tek tek DELETE edilmez; yanlış cevap güncellenir.
- Bütün denetim yetkili yönetici tarafından silinirse ilişkili satırlar kontrollü cascade ile kaldırılabilir.
- Anon kullanıcı kütüphane, profil veya denetim verisini okuyamaz.
- `authenticated` rolüne tablo ihtiyacından fazla `TRUNCATE`, `REFERENCES`, `TRIGGER` veya geniş DELETE yetkisi verilmez.
- IT/sistem yöneticisi olmak otomatik teknik karar yetkisi anlamına gelmez.

RLS yalnız arayüzde buton gizlemek değildir. Aynı kurallar doğrudan veritabanında doğrulanmalıdır. Migration önce eski R11/R12/R15C policy adlarını temizleyip sonra tek ve anlaşılır policy seti kurmalıdır. Migration idempotent olmalı; ikinci çalıştırmada veri veya not çoğaltmamalıdır.

## 13. Denetim ve kütüphane snapshot ilkesi

Master kütüphane değiştiğinde eski denetimin metni sessizce değişmemelidir. Denetim oluşturulurken kullanılan madde metni, kaynak form/revizyon, sıra, uygulanabilirlik kuralı ve ölçüm tanımları denetim snapshot’ında korunmalıdır.

Bugün ÜB.FR.38 R.04 ile yapılan denetim, gelecekte R.05 yayımlandığında R.05 metnine dönüşmemelidir. Eski denetim kendi dönemindeki kaynağı göstermelidir. Yeni kütüphane sürümü yalnız yeni denetimlere uygulanır veya açıkça yönetilen bir yeniden değerlendirme süreciyle taşınır.

Migration tarihsel `saha_kontrol` satırlarını veya eski denetim snapshot’larını “temizlik” adına silmemelidir. MAD-1010 gibi yeni denetimlerde pasifleştirilen eski bir madde tarihsel denetimde bulunuyorsa snapshot korunur ve gerekirse migration notuyla açıklanır.

## 14. İçerik kalite kuralları

Asansör kontrol maddesi kritik teknik içeriktir. Şu tür maddeler kabul edilmez:

- “33. madde” gibi neyin kontrol edileceği belli olmayan metin.
- Yalnız standardın ham cümlesini taşıyan, saha eylemi açıklamayan başlık.
- Madde ile saha rehberinin aynı cümleyi tekrar etmesi.
- Uygulanmaz koşulunun hem madde hem rehber hem koşul kutusunda üç kez yazılması.
- “Ölçülen değer” adlı fakat hangi büyüklük ve birim olduğu belli olmayan alan.
- Kaynakta olmayan eşik, ölçü, uygulanabilirlik veya sonuç zorunluluğu.
- Uygulamanın kendi teknik notunun saha kriterine karışması.
- Kırpılmış, yarım veya yanlış bölüm başlığından miras alınmış madde başlığı.
- Kaynağı doğrulanmadan hazırlanmış şema veya görsel.

Her madde şu sorulara cevap vermelidir:

1. Neyi kontrol ediyoruz?
2. Gereklilik nedir?
3. Denetçi sahada bunu nasıl doğrular?
4. Ölçülecekse büyüklük, birim ve referans nedir?
5. Hangi durumda uygulanmaz?
6. Kaynak doküman, revizyon ve madde nedir?
7. Gerekli görsel hangisidir ve kaynakla uyumlu mudur?

Tip 3 hareketli ve Tip 4 katlanabilir kuyu dibi merdivenleri için ayırt edici görsel bulunmalıdır. Sığınma alanı görsellerinde uydurma çömelmiş insan çizimleri kullanılmamalı; kaynak standardın tablo/şekil bilgisi doğru ve okunabilir biçimde sunulmalıdır.

Ölçüm eşiği varsa denetçi ölçüyü girerken referans değeri ekranda görmelidir. Sistem “Uygun Değil işaretlemeyi düşünün” önerisi gösterebilir; sonucu otomatik değiştirmez. Sayısal olmayan bilgi için sayısal kutu kullanma; seçim/metin/çoklu ölçüm veri tipini doğru modelle.

## 15. Şimdiye kadar doğrulanmış içerik düzeltmeleri

Bu kararları kaybetme:

- MAD-0561–MAD-0613 aralığındaki 52 yanlış miras başlığı kaynak DOCX’e göre “Testler” ve “Hidrolik Kontrol ve Testleri” olarak düzeltildi.
- MAD-0824, MAD-0814 ile gerçek mükerrer olduğu için pasifleştirildi; tarihsel snapshot silinmedi.
- MAD-0460, MAD-0467, MAD-0486 ve MAD-0492 yanlış MRL etiketinden MR koşuluna düzeltildi.
- MAD-1010 “Tekrar saha ziyareti gerekiyor mu?” yeni kütüphanede pasifleştirildi; tarihsel kayıt korunur.
- MAD-0946 ve MAD-1004, ÜB.FR.43 içindeki mükerrer/paralel kayıt incelemesi kapsamında pasifleştirildi; ÜB.FR.43’ün yaklaşık 80 kontrollü maddesinin tamamı kaldırılmış değildir.
- Eski, kaynaksız/yanlış konumlanmış erişilebilirlik taslak bloğu pasifleştirildi; kontrollü ÜB.FR.43 eşleşmeleri korunmalıdır.
- Kuyu dibi kullanıcı geri bildiriminde belirtilen 33, 34, 38, 54, 57, 73, 77 ve Tip 3/4 merdiven maddeleri açık saha diline çevrildi.
- Bütün kütüphanede rehberin resmi gerekliliği birebir tekrarladığı satırlar, rehberde ek saha bilgisi yoksa temizlendi.
- Uygulanmaz koşulunu rehberde tekrar eden kalıplar ayrı koşul alanına taşındı.
- Genel “Ölçülen değer” alanları temizlendi; doğrulanabilen ölçümlere anlamlı ad ve birim eklendi; çoklu büyüklükler ayrı alanlara bölündü.
- Saha ölçümü olmayan laboratuvar/dayanım hükümlerindeki anlamsız sayısal kutular kaldırıldı.

Kütüphane kalite taramasında R15D-rc2 öncesi 1.019 satırda 2.019 bulgu vardı: 979 eski sonuç seçeneği, 549 tekrar eden rehber, 331 birimsiz ölçüm, 49 kaynak eşleme çakışması, 35 uygulanabilirlik tekrarı ve başka sorunlar. Kontrollü temizlik sonrasında 68 orta seviye bulgu kaldı: 40 uzun başlık koşusu, 27 benzer/tekrar gövde ve 1 paralel gereklilik. Bu kalan 68 kayıt otomatik olarak hatalı kabul edilmemelidir. Her biri kaynak form ve standart üzerinden tek tek incelenmeli; yalnız tekrar ediyor diye topluca silinmemelidir.

TS EN 81-28’in kütüphanede önce yalnız üç şemsiye maddeyle temsil edildiği ve 32 detay kriterin eksik olabileceği tespit edilmişti. Drive’da ÜB.FR.62 R.03 mevcuttur. Bu form kaynak bazlı ayrı çalışma olarak çıkarılmalı; detay kriterler kullanıcı/AVES onayı olmadan doğrudan canlı kütüphaneye eklenmemelidir. TS EN 81-77, 81-21 ve 81-22 için de aynı derinlikte kaynak eşleme denetimi planlanmalıdır.

## 16. Test yaklaşımı ve kabul kriterleri

Her değişiklik için yalnız sözdizimi testi yeterli değildir. En az şu katmanlar bulunmalıdır:

### Statik ve kütüphane testleri

- Build etiketi ve paket içeriği eşleşiyor mu?
- Cloudflare ZIP içinde `madde_kutuphanesi.json`, SQL, backup, service key veya hassas veri var mı?
- Her aktif madde id’si benzersiz mi?
- `denetim_id + madde_id` benzersizliği korunuyor mu?
- Sonuç seçenekleri yalnız üçlü mü?
- Eski `Kontrol edilemedi/Veri eksik/Aranmaz` yeni sonuç olarak sızıyor mu?
- Rehber/gereklilik/uygulanmaz koşulu tekrarları var mı?
- Ölçüm adı, birimi, tipi ve eşiği tutarlı mı?
- Kaynak form/revizyon alanları dolu ve çakışmasız mı?
- Referans görsellerinin dosyaları ve referans id’leri eşleşiyor mu?

### Migration testleri

- Gerçek canlı şema ve veri kopyasında prova.
- İlk ve ikinci çalıştırma.
- Satır sayısı ve tarihsel örneklerin korunması.
- Beklenmeyen başlangıç durumunda fail-fast ve tam rollback.
- Eski policy/grant/constraint varyantları.
- Mükerrer veri fixture’ında silmek yerine durma.
- 52 başlık, 4 MR koşulu, MAD-0824, MAD-1010 ve rc2 içerik düzeltmelerinin doğrulanması.

### RLS testleri

- Mühendis kendi/açık denetimini okuyup güncelleyebilir mi?
- Başkasının denetimini değiştirebiliyor mu? Değiştirememeli.
- Mühendis DELETE yapabiliyor mu? Yapamamalı.
- Teknik müdür/yönetici bütün denetimi silebiliyor mu?
- Hiçbir rol tek checklist satırını silebiliyor mu? Silememeli.
- Anon kütüphane/profil/denetim okuyabiliyor mu? Okuyamamalı.

### Offline ve senkronizasyon testleri

- Binaya girmeden denetim ve gerekli kütüphane eksiksiz hazırlanabiliyor mu?
- İnternet tamamen kapalıyken yüzlerce madde cevaplanabiliyor mu?
- Her sonuç yerel transaction’dan sonra kalıyor mu?
- Uygulama/telefon kapanıp açılınca son madde ve outbox geri geliyor mu?
- İnternet gönderimin ortasında kesilince mükerrer oluşuyor mu?
- 403/409/timeout kayıtları cihazda koruyor mu?
- Pull’dan eksik liste gelmesi yerel veriyi siliyor mu? Silmemeli.
- Denetim internet yokken Gözden Geçirme’ye ve tamamlanmaya geçebiliyor mu?
- Bağlantı dönünce bütün bekleyen işlemler sıralı ve kontrollü gönderiliyor mu?
- Sunucu sayısı ile cihazdaki beklenen sonuç sayısı eşleşiyor mu?

### Mobil saha testleri

- Android ve iOS gerçek cihaz.
- Islak el/eldivenle büyük dokunma hedefleri.
- Güneş yansıması ve düşük ışık.
- Düşük pil ve uzun süre açık kalma.
- Hızlı art arda Uygun işaretleme.
- Yatay taşma ve ekran klavyesi.
- Müşteri Ünvanı input regresyonu.
- Bölüm bitiminde otomatik sonraki bölüm.
- Son bölümde geri başa dönmeme.
- Tip 3/4 ve sığınma alanı görsellerinin okunabilirliği.

## 17. Canlı değişiklik yapılacaksa zorunlu sıra

Kullanıcı daha sonra canlı kurulum isterse:

1. Mevcut Supabase proje/sürüm/şema/satır sayılarını salt okunur sorgularla yeniden kontrol et.
2. Şema, veri, policy, function, trigger ve grant yedeği al. Mümkünse `pg_dump`; değilse mevcut JSON/schema backup’ın sınırını açıkça yaz.
3. Yedeği hassas veri olarak koru; deploy paketine veya paylaşılan repoya koyma.
4. Migration’ı gerçek yedeğin geçici PostgreSQL kopyasında iki kez çalıştır.
5. Fail-fast kontrollerini ve rollback’i doğrula.
6. Canlı migration’ı tek transaction içinde uygula.
7. Satır sayılarını, düzeltmeleri, constraint, grant ve RLS matrisini doğrula.
8. Uygulamayı önce preview/özel test alanında yayımla.
9. `pages.dev` Türkiye erişim sorunu nedeniyle özel alan adı kullan.
10. Temiz cihazda, eski Service Worker bulunan cihazda ve tamamen offline cihazda smoke test yap.
11. Ancak kullanıcı kabulünden sonra production’a geçir.
12. Yapılan değişiklikleri, hash’leri, migration kimliğini, test sonuçlarını ve bilinen açıkları sürüm notuna yaz.

Canlıda `DROP TABLE`, `TRUNCATE`, kontrolsüz `DELETE`, toplu `UPDATE` veya temiz kurulum SQL’i çalıştırma. Eski R13–R15C temiz kurulum dosyaları tarihsel kaynaktır; mevcut canlı sisteme uygulanmaz. `database/20_r15c_yetki_akis_ve_senkron_migrasyonu.sql` tarihsel satırları silen/değiştiren eski yaklaşımı içerdiği için canlıda kullanılmamalıdır.

## 18. Bundan sonraki öncelikler

### P0

- Özel alan adı ile Türkiye’den güvenilir production erişimi.
- Canlı ve temiz cihazda R15D-rc2.3 doğrulaması.
- Gerçek Supabase oturumuyla RLS uçtan uca testi.
- Yüzlerce outbox işleminin düşük hızlı gerçek ağda aktarımı.
- Oturum süresi dolması/token yenileme sırasında yerel verinin korunması.
- İki cihaz çakışması için tam optimistic-lock ve kullanıcıya çözdürme akışı.
- Cihaz kotası dolduğunda veri kaybetmeden durma ve açık uyarı.

### P1

- Kalan 68 kütüphane kalite bulgusunun kaynak bazlı incelemesi.
- ÜB.FR.62/TS EN 81-28 detay eşlemesi.
- ÜB.FR.57/58/63 ve 81-22/77/21 derin kaynak eşlemesi.
- Ölçümlerde referans değerini görünür kılma ve öneri mekanizmasının testleri.
- Denetim snapshot/revizyon modelini daha açık ve tam hale getirme.
- Audit event altyapısı: kim, neyi, ne zaman, eski/yeni değerle değiştirdi.
- Gerçek Android/iOS uzun saha testi.

### P2

- Ölçüm cihazı ve kalibrasyon kaydı.
- Teknik dosya-saha eşlemesinin ÜB.FR.65 ile sistematikleştirilmesi.
- Kontrollü rapor/PDF çıktısı ve resmi sürece veri eşleme.
- AVES kurumsal arşivine doğrulanmış yedekleme.
- Geçmiş denetim ve uygunsuzluk karşılaştırma ekranı.

### P3

- Kaynak gösteren yapay zekâ saha yardımcısı. Yalnız hatırlatma, benzer kayıt bulma ve ifade önerisi; uygunluk/belgelendirme kararı yok.

## 19. Çalışma biçimin

- Önce oku, sonra planla, sonra küçük ve doğrulanabilir değişiklik yap.
- Kullanıcının mevcut dosyalarını, yedeklerini ve canlı verisini koru.
- Bir maddeyi düzeltirken aynı hata sınıfının bütün kütüphanede bulunup bulunmadığını tara.
- Ancak geniş otomatik düzeltmeyi, yanlış pozitif üretmeyecek kesin kural varsa uygula.
- Kaynağı belirsiz içerikte “makul” metin uydurma.
- İçerik değişikliğinde önce eski/yeni metin, kaynak, gerekçe ve etkilenen madde listesini raporla.
- Veritabanı değişikliğini arayüz davranışı ve RLS ile birlikte düşün.
- Her değişiklikten sonra ilgili regresyon testini ekle.
- Sürüm adını tek başına otorite sayma; dosya hash’i, migration listesi ve build etiketiyle doğrula.
- Yapmadığın veya gerçek ortamda doğrulamadığın işi yapılmış gibi yazma.

## 20. İlk teslimatın

Bu brifi aldıktan sonra ilk yanıtında kod değiştirme. Şunları üret:

1. İncelediğin mevcut dosyalar ve saptadığın gerçek sürüm.
2. Mimari ve veri akışını kendi cümlelerinle kısa doğrulama.
3. Kesinleşmiş kararlar listesi.
4. Çelişki veya doğrulama gerektiren noktalar.
5. P0/P1 iş planı.
6. Canlıya dokunmadan önce çalıştıracağın test ve yedek planı.
7. Kullanıcıdan gerçekten gerekli olan erişim veya kararlar; gereksiz soru sorma.

Bu proje için temel başarı ölçütü şudur:

> Denetçi internet olmadan bütün çalışmasını güvenle tamamlayabilmeli; hiçbir cevap sessizce kaybolmamalı; her teknik madde açık, kaynaklı ve sahada uygulanabilir olmalı; uygulama denetçinin yerine karar vermemeli; geçmiş kayıtlar ve kurumsal yetkiler korunmalıdır.
