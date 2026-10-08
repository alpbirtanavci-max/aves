# Codex brief — EN 81-20 kabin kullanılabilir alanı ve kişi sayısı

Tarih: 2026-10-08  
Dal: `codex/en81-20-car-area`  
Kapsam: hesap-motoru; EN 81-20:2020, 5.4.2.1 ve 5.4.2.3

## Amaç

Elektrikli/sürtünmeli yolcu asansörleri için anma yükü ile kabinin ölçülen kullanılabilir alanını karşılaştıran ve 5.4.2.3.1'e göre beyan edilen kişi sayısını kontrol eden, tekrar üretilebilir bir hesap modülü eklemek. Bu, motorun uygunluk/belgelendirme kararı verdiği anlamına gelmez.

## Kaynak ve kural özeti

- Kullanıcının Google Drive'ındaki `BS EN 81-20-2020.pdf`, 5.4.2.1.1–5.4.2.1.4, Table 6 ve 5.4.2.3.1, Table 8. Dosya metni doğrudan okundu; Tablo 6 ara yüklerde doğrusal enterpolasyon, 2500 kg üzeri için her ilave 100 kg başına 0,16 m²; Tablo 8'de 20 kişi üzeri her ilave kişi başına 0,115 m².
- 5.4.2.1.2: alan, döşeme bitirmeleri hariç, zeminden 1 m yükseklikte kabin gövdesinin içten içe boyutlarından ölçülür.
- 5.4.2.1.3: girinti/uzantı ve kapı dikmeleri arasındaki alanın dahil edilmesi/çıkarılması kuralları ölçülen kullanılabilir alana uygulanır. Motor bu geometrik ayrıntıları kendiliğinden çıkaramaz; bu nokta raporda görünür bir ölçüm notu olarak kalır.
- 5.4.2.3.1: azami yolcu sayısı, aşağı yuvarlanmış `Q/75` ile Tablo 8'in alan karşılığından elde edilen sayıların küçüğüdür. 75 kg/kişi temeli 0.3.6'dadır.
- Hidrolik yük-yolcu asansörlerine ait Table 7 istisnası bu işin kapsamı dışındadır; ISO 8100 geçişi de ertelenmiştir.

## Girdi/çıktı yaklaşımı

FR.47 düzeyinde küçük girdi seti hedeflenir: anma yükü, kullanılabilir alan (veya alanı oluşturan temel ölçüler) ve kabinde yazılı kişi sayısı. Standarttaki 1 m ölçüm seviyesi ile kapı/girinti kurallarını saha gözlemcisi teyit eder; motor bunları varsaymaz. Çıktı hesaplanan Table 6 üst sınırını, ölçülen alanı, Table 8 alanından hesaplanan kişi kapasitesini, Q/75 sınırını, beyan edilen kişi sayısını, izlenebilir formül/ara değerleri ve kaynak notunu taşır.

## Güvenlik ilkeleri

- Eksik, sayısal olmayan, sıfır/negatif veya standart aralığı dışındaki girdiler `BLOCKED` olmalı; hiçbir halde `PASS` verilmemeli.
- Table 6'nın 100–2500 kg aralığı dışında tablo dışı enterpolasyon yapılmaz; 2500 kg üstü yalnız tabloda açıkça verilen 0,16 m²/100 kg uzatmasıyla hesaplanır.
- Her durum yalnız hesaplanan kriteri anlatır. Rapor genel sonuç/uygunluk kararı vermez ve imza alanları boş kalır.
- Kaynak durumu ikinci gözden geçirme bekleyen kural olarak `PENDING` kalır.

## İstenen iş ve testler

1. Saf hesap fonksiyonu ve tablo-veri kümesi ekle.
2. Engine, rule catalog, sentetik örnek ve source notes'e entegre et.
3. Table 6 düğüm değerleri, ara yük, 2500 kg üstü uzatma, alan sınırı eşitliği, yolcu sayısı/20 üstü sınırları, eksik/geçersiz girdiler ve işaretli kişi sayısı için bağımsız beklenen değerli testler yaz.
4. `npm test`, `npm run test:hesap` ve sentetik CLI raporu çalıştır; PWA/migration/RLS dosyalarına dokunma.
5. Farklı bir kişi merge öncesi diff'i inceler; bu brief ve kaynak izi commit'te kalır.

## Çözülmemiş/harici teyit

Standart kopyası Birleşik Krallık ulusal baskısı (BS EN 81-20:2020) olarak kaydedilmiştir; Türkiye'deki yürürlük/ulusal önsöz ve AVES kontrollü form revizyonu bu özellik kapsamında teyit edilmemiştir. Bu nedenle kaynak notu taslak statüsünde kalır.
