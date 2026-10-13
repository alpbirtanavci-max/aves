# FR.65 saha veri toplama — B / E / H1

## Amaç ve kapsam kararı

Modül G mevcut tam saha checklistiyle devam eder. Yeni Modül B, E ve H1
kayıtlarında AVES Saha yalnız ÜB.FR.65 referanslı teknik dosya ve saha verilerini
toplar. E modülünde bu akışın kullanılması kullanıcı tarafından açıkça onaylandı;
FR.65'in E için resmi form setinde zorunlu işaretli olmadığı bilgisi arayüzde
şeffaf tutulur. Resmî form üretimi Form Doldurucu'da kalır.

Kayıt uygunluk/belgelendirme kararı, resmi çıktı veya G checklisti üretmez. Teknik
dosya beyanı, sahada görülen/ölçülen değer ve isteğe bağlı kanıt notu ayrı tutulur.
Sayaç yalnız veri bulunan alanları sayar; tamamlık/uygunluk hükmü değildir.

## Kanıt ve uygulama noktaları

- `work/r15d-rc1-unified/app/teknik-dosya-formlari.js:226` — FR.65 saha kaydı
  zarfı ve tahrik tipine göre ilgili alan sayacı.
- `work/r15d-rc1-unified/app/app.js:1620` — B/E/H1 modül, denetim türü, profil ve
  yeni akış işaretini birlikte doğrulayan açılma kapısı.
- `work/r15d-rc1-unified/app/app.js:2261` — modül seçimi/özet onayı ve kayıt
  başlangıç akışı; B/E/H1 için Ana Tip/varyant ve A3 seçimi yoktur.
- `work/r15d-rc1-unified/app/app.js:2325` — G checklist satırı ve resmi çıktı
  snapshotı oluşturmadan yeni FR.65 kaydı oluşturur.
- `work/r15d-rc1-unified/app/app.js:2936` — FR.65 veri ekranı, saha güvenliği
  hatırlatması, çevrimdışı kayıt, tamamlanmış kaydın salt-okunur gösterimi ve
  denetim geçmişiyle yeniden açma.
- `work/r15d-rc1-unified/app/form-draft-journal.js:72` — sekme ve hesap başına
  ayrı FR.65 yerel taslak anahtarı; sekmeler birbirinin taslağını yazamaz, taşıyamaz
  veya silemez. Uygulama `sessionStorage` kimliğini Web Lock ile tek belgeye ayırır;
  kilit API'si yoksa her belgeye yeni kimlik verip eski taslağı açık geri yükleme
  onayına bırakır. Eski ortak anahtardaki taslaklar içeri alınır.
- `work/r15d-rc1-unified/app/app.js:368` — çevrimdışı koşullu PATCH; ağ yanıtı
  belirsizse tekrar yazmadan sunucudaki hedef alanları doğrular.
- `work/r15d-rc1-unified/tests/r15d-static-test.mjs:1296` — modül kapıları,
  veri alanları, taslak ayrımı/çakışma koruması ve G akışının korunmasına ilişkin
  statik davranış testleri.

## Veri ve yetki sınırı

- Mevcut `denetim_form_kayitlari` ve `teknik_dosya_kayitlari` JSONB alanları
  kullanılır. Migration, yeni RLS politikası veya canlı veritabanı işlemi yoktur.
- Yazım mevcut `localWrite`/outbox ve değişiklik geçmişi yolundan yapılır.
- Yeni kayıt isteği belirsiz ağ yanıtında yinelense bile `ignore-duplicates`
  ile var olan sunucu satırını ezmez. Sonraki FR.65 güncellemeleri yalnız beklenen
  `updated_at` ile eşleşirse PATCH edilir; eşleşme yoksa 409 olarak outbox'ta
  korunur ve Senkron Merkezi'nde incelenir. Bu koruma GET-ön kontrolüne değil,
  sunucu tarafındaki tek PATCH koşuluna dayanır.
- PATCH başarılı olduktan sonra yanıt kaybolursa uygulama, tekrar yazmak yerine
  sunucudaki ilgili alanları okur. İstenen değerler zaten mevcutsa işlemi idempotent
  başarı sayar; doğrulanamıyorsa cihazdaki outbox kaydını korur.
- Hızlı ardışık girişte başarıyla cihaza yazılmış eski anlık görüntü, düzenleme
  temel sürümünü ilerletir; daha yeni taslak silinmeden yeni tabana bağlanır.
- Yeni kayıtlardaki `ana_standart: '81-20'` değeri, mevcut zorunlu veritabanı
  alanını karşılayan uyumluluk değeridir; bu FR.65 akışında standart checklisti,
  EN 81-1/2+A3 seçimi veya uygunluk kararı anlamına gelmez.
- Eski B/E/H1 kayıtları yeni forma alınmaz; yalnız yeni akış işaretli ve doğru
  modül/profildeki kayıtlar açılır.
- Fotoğraf/video ek dosyası yükleme bu işin kapsamında değildir; alanlarda kanıt
  referansı/notu tutulabilir.

## Doğrulama

- `node --check work/r15d-rc1-unified/app/app.js`
- `node --check work/r15d-rc1-unified/app/form-draft-journal.js`
- `node --check work/r15d-rc1-unified/tests/r15d-static-test.mjs`
- `npm test` — 418/418 kontrol geçti; sekmeler arası ayrı taslak, yazarı/sürümü
  eşleşmeyen silme-rebase reddi ve PATCH yanıt kaybı teyidi kapsanıyor.
- `git diff --check` başarılı.

Bu kod kullanıcı incelemesi için branch/PR olarak sunulur. PR incelemesi ve gerçek
cihaz/saha denemesi tamamlanmadan merge veya canlıya aktarım yapılmaz.
