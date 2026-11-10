# Teknik dosya PDF ve yerel metin adayları — devir notu

**Tarih:** 2026-11-06  
**Dal:** `codex/technical-pdf-extraction-20261106`  
**Başlangıç:** production `8fa2e7c` (PR #70 sonrası, R15D-rc3.19.1)  
**Çalışma sürümü:** R15D-rc3.19.2  
**Durum:** Yerel değişiklikler hazır; test, migration provası, push, PR ve canlı dağıtım yapılmadı.

## Kullanıcı kararı ve sınırlar

İstenen özellikler:

1. Denetime bağlı teknik dosyayı PDF olarak eklemek.
2. Hız, yük/kapasite, durak sayısı, model ve ekipman gibi seçili bilgileri çıkarmak.

Kullanıcı dış AI kullanımını açıkça reddetti. PDF, cihazda PDF.js ile okunur; uygulama PDF içeriğini AI/OCR servisine göndermez. Çıkarılanlar otomatik doldurulan veya doğrulanmış değerler değil, sayfa numarası ve alıntı metniyle gösterilen adaylardır. Adaylar yalnızca panoya kopyalanabilir; sahada görülen/ölçülen FR.65 alanlarını otomatik değiştirmez.

Bu sürümde metin katmanı olmayan taranmış PDF için OCR yoktur. Dosya en fazla 20 MB ve 250 sayfadır. Bu sınırı aşan veya okunamayan PDF cihazda korunur; çıkarım başarısızlığı saha verisini engellemez.

## Uygulanan değişiklikler

- FR.65 ekranına denetime bağlı PDF kartı eklendi: ekle/değiştir, aç/indir, kaldır, tekrar oku ve çevrimdışı PDF okuyucuyu hazırlama.
- PDF cihazdaki IndexedDB deposunda tutulur; özel Supabase Storage bucket'ına ve metadata tablosuna çevrimiçi/çevrimdışı kuyrukla aktarılır. Dosya SHA-256 özeti indirmede kontrol edilir.
- PDF açılırken uzaktaki dosya otomatik indirilmez. Başka cihazdaki dosyayı cihaza indirmek kullanıcı eylemi gerektirir.
- Senkron Merkezi bekleyen PDF'leri gösterir. Eşzamanlı değişiklikte yerel ve sunucu kopyaları korunur; kullanıcı iki dosyayı indirip karşılaştırdıktan sonra hangi kopyanın geçerli olacağını seçebilir.
- PDF/çıkarım kuyruğu kapanış denetimini silmeye engel olur; önce PDF'nin kaldırılıp eşitlenmesi gerekir.
- İsteğe bağlı PDF varsa "Sahaya Hazırla" okuyucu kaynaklarını önbelleğe almaya çalışır. Bu satır advisory'dir ve diğer çevrimdışı hazırlığı engellemez.
- PDF.js 6.2.108, Apache-2.0 lisansı ve lisans bildirimiyle yerelde vendored edildi.
- IndexedDB sürümü 6'dan 7'ye yükseltildi. Migration 87 production'da cihaz senkron durumuna ayrıldığı için teknik PDF migration'ı 88 numaralı dosyadır.

## Dosyalar

- `app/teknik-pdf.js` — cihaz kaydı, özel Storage aktarımı, indirme ve çakışma yönetimi.
- `app/pdf-field-reader.mjs` — PDF.js üzerinden metin katmanını okuyup belirli alanlar için aday çıkarımı.
- `app/vendor/pdfjs/` ve `app/vendor/THIRD_PARTY_NOTICES.txt` — yerel PDF.js dağıtımı ve lisans notu.
- `app/app.js`, `app/index.html` — FR.65 kartı, aday görünümü ve kullanıcı eylemleri.
- `app/db.js`, `app/config.js`, `app/sw.js`, `app/manifest.json` — yerel depo, çevrimdışı paket ve sürüm bilgisi.
- `app/senkron.js` — bekleyen PDF'leri Senkron Merkezi'nde görünür kılma ve gönderme.
- `database/88_r15d_rc3192_teknik_dosya_pdf.sql` — tablo, private bucket ve RLS politikaları.
- `tests/r15d-static-test.mjs` — IndexedDB sürüm beklentisi güncellendi; yeni test eklenmedi ve testler çalıştırılmadı.

## Merge öncesi gerekli doğrulama

1. `node --check` ile `app.js`, `teknik-pdf.js` ve modül sözdizimini kontrol et; ardından mevcut statik test paketini çalıştır. Bu devir sırasında bunlar çalıştırılmadı.
2. Migration 88'i önce yerel/prova ortamında uygula; bucket private, boyut/MIME sınırı ve klasör kısıtını doğrula.
3. RLS'yi en az denetim sahibi/yazabilir rol, yönetim rolü, atanmış aktif mühendis, ilgisiz aktif kullanıcı ve anonim kullanıcıyla doğrula. Yetkisiz kullanıcı ne metadata'yı ne de PDF Storage nesnesini görmeli/değiştirmeli.
4. Çevrimiçi yükle/indir/sil ve belirsiz ağ yanıtı sonrası tekrar gönderme akışını gerçek hesaplarla dene. Aynı denetimi ikinci cihazda değiştirip iki kopyalı çakışma çözümünü de doğrula.
5. Metin içeren gerçek bir teknik PDF ve taranmış PDF dene. Hız, yük/kapasite, durak, model ve ekipman adaylarının sayfa/kanıt metniyle gösterildiğini; saha alanlarının kendiliğinden değişmediğini doğrula.
6. İnternet bağlantısı kesikken PDF yükleme, yerel saklama, okuyucu kaynaklarını hazırlama ve yeniden bağlantıda eşitlemeyi fiziksel telefonda dene.
7. Önce migration 88, sonra uygulama PR'ı. Canlıya alma için ayrıca açık kullanıcı onayı gerekir.
