# FR.65 ray–kapı ve kapı ölçüsü sadeleştirmesi

Tarih: 13.10.2026
Branch: `codex/fr65-ray-door-combined`

## Kanıtlanan mevcut durum

- FR.65 şeması: `work/r15d-rc1-unified/app/teknik-dosya-formlari.js`.
- FR.65 çizimi ve otomatik kayıt: `work/r15d-rc1-unified/app/app.js` içindeki `renderFr65SahaKaydi`.
- İlgili regresyonlar: `work/r15d-rc1-unified/tests/r15d-static-test.mjs`.
- Canlı taban: `rc3.9.85`, production merge `2c6af679`.
- `ray_kapi_mesafeleri_cm` şu an serbest metin alanı; ayrı bir mesafe değeri girişi ve konum başına kayıt yapısı yok.
- Kuyu alt/üst güvenli çalışma boşlukları aktif sayısal alanlar.
- Kabin/kat kapıları ayrı ölçü, yön, tip ve panel alanları kullanıyor.
- Genel bölümde `kabin_giris_sayisi_yeri` serbest metin alanı var.

## İstenen değişiklikler

1. Ray–kapı mesafesini serbest metin yerine konum + cm değeri içeren ölçüm satırlarıyla toplamak; birden fazla konum eklenebilmeli.
2. Ana kılavuz rayı ile karşı ağırlık rayı arasındaki mesafeyi hemen arkasına ayrı cm sayı alanı olarak eklemek.
3. Kuyu altı ve kuyu üstü güvenli çalışma boşluklarını aktif ölçüm alanlarından kaldırmak; önceki değerleri kaybetmeden tarihsel notta göstermek.
4. Kabin giriş sayısını tek sayısal alan yapmak, belirsiz giriş konumunu kaldırmak; eski birleşik değeri tarihsel olarak korumak.
5. Kabin ve kat kapısı net genişlik/yüksekliğini tek ortak ölçü çiftine indirmek. Kapı alanlarının adlandırmasında “kabin ve kat kapısı” kapsamını belirtmek; önceki ayrı alanları silmeden tarihsel olarak göstermek.

## Kapsam ve güvenlik

- Yalnız FR.65 JSON alanı ve arayüz; veritabanı migrationı yok.
- Önceki kayıt değerleri silinmeyecek veya yeni birime/alana varsayımla taşınmayacak.
- Yeni ölçüm noktaları mevcut offline taslak ve IndexedDB/outbox kaydetme akışını kullanmalı.
- Ürün uygunluk/belgelendirme kararı üretmemeli.

## Kabul ve test

- Yeni çoklu konum mesafelerinde konum ve cm değeri ayrı saklanır; tamamlanma sayacı en az bir tam satır olmadan alanı tamam saymaz.
- Yeni ana-ray/karşı-ağırlık ray mesafesi cm sayısal alanı olarak ayrı görünür ve ray–kapı alanından hemen sonra gelir.
- Güvenli çalışma boşluğu alanları aktif şemada yoktur; önceki kayıtlar görünür biçimde korunur.
- Kabin giriş sayısı sayısaldır; giriş konumu aktif alanda istenmez, tarihsel değer kaybolmaz.
- Kapı ölçüleri bir ortak genişlik/yükseklik çifti olur; eski ayrı değerler kaybolmaz.
- Statik test, sözdizimi kontrolü ve `git diff --check` çalışır; bağımsız diff incelemesi merge öncesi zorunludur.
- Production dağıtımı yalnız açık kullanıcı onayıyla yapılır; bu istekte henüz production'a alma talebi yok.

## Uygulama durumu

- FR.65 değişiklikleri `rc3.9.86` sürümüne işlendi; veritabanı değişikliği yok.
- Ölçüm noktası satırları `points: [{ position, distance_cm }]` olarak aynı FR.65 JSON kaydına girer ve mevcut yerel taslak/outbox akışından geçer.
- Yerel statik testler: 444/444; JS sözdizimi ve `git diff --check` temiz.
- PR/bağımsız inceleme bekleniyor; production deploy için bu istekte açık onay verilmedi.
