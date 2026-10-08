# CLAUDE_BRIEF — AVES Hesap Motoru (devir brief'i)

Tarih: 2026-10-08 · Dal: `claude/hesap-motoru-cekirdek` · Dizin: `hesap-motoru/` (uygulama kökü `work/r15d-rc1-unified/` dışında)
Sahip: Claude (tek iş / tek branch — AGENTS.md bölüm 2). Diff incelemesi: Codex (merge öncesi zorunlu).

## 1. Amaç

ÜB.FR.47'den daha izlenebilir, kaynaklı ve testli bir **tasarım hesabı doğrulama motoru**; çıktısı AVES adına
kullanılabilecek **hesap raporu** (JSON/Markdown/yazdırılabilir HTML). Ürün sınırı: karar vermez, imza atmaz
(AGENTS.md §1). Durum etiketleri: Kriter sağlandı / sağlanmadı / Teknik inceleme / Bloke.

## 2. Bu dalda yapılanlar

- Çekirdek: sonuç modeli, durumlar, girdi korumaları (`src/core.mjs`), kural kataloğu ve doğrulama durumu (`src/catalog.mjs`).
- Askı (5.5, 5.12), çekiş (5.11, 5 durum), ray (5.10 + Ek C; kabin ve merkezî karşı ağırlık), emniyet tertibatı,
  regülatör, tampon. 104 birim testi; beklenen değerler standart formülleri/örnekleriyle **elle** hesaplandı.
- Rapor üreticisi + CLI + sentetik örnek proje.
- `npm run test:hesap`, CI'a `hesap-motoru-test` işi eklendi. `npm test` (statik test) etkilenmedi.

## 3. Kaynaklar ve doğrulama durumu

Standart metni repoya kopyalanmadı. Formül özeti: `hesap-motoru/docs/KAYNAK_NOTLARI.md`. Okunan kopyalar kullanıcının
Drive klasöründendir (yetkili erişim; baskı/yürürlük TSE/harmonize liste üzerinden hâlâ doğrulanmalı — Master Brief §4).

- EN 81-20:2020 — İngilizce BS metni okundu (5.5, 5.6, 5.7, 5.8, 5.9, Ek E.2).
- EN 81-50:2020 — **Türkçe çeviri TS EN 81-50:2021 sayfa görüntülerinden** okundu (5.3, 5.5, 5.10, 5.11, 5.12, Ek C/D/E);
  5.11.2.3 ve 5.12.2 ayrıca **İngilizce EN 81-50:2014 metniyle** karşılaştırıldı (uyumlu). Drive'daki İngilizce
  `BS EN 81-50-2020.pdf` taranmış görüntü ve 10 MB sınırı nedeniyle okunamadı → **İngilizce 2020 aslıyla karşılaştırma bekliyor.**
- ISO 8100-33:2022 (Tablo 2, kesit tablosu), EN 12385-5:2021, EN 13411-7 (Türkçe), NB-L/REC 2/026-06 okundu.
- **Hiçbir kuralın ikinci kişi teknik gözden geçirmesi yapılmadı** → rapor TASLAK damgalıdır (`independentReview: 'PENDING'`).

## 4. Eski AVES-Hesap v25 (HTML) için doğrulanmış bulgular — Codex'in düzeltme işine girdi

Kaynak paket depoda değil (kullanıcıdan alınan `AVES-Hesap-Claude-Inceleme-2026-10-08.zip`, `dist/index.html`). Satırlar o dosyaya aittir.

| # | Önem | Satır | Bulgu | Kaynak sınıfı |
|---|---|---|---|---|
| A | Yüksek | 1358–1373, 1584 | Emniyet tertibatı durumunda Fx/Fy moment kolu `x−xS` ile alınıyor; Ek C.2.1.1 **ray koordinatına göre** (`xQ`, `xP`) ister. Arka duvar/eksantrik askıda ~15× düşük (örnek: 195 N yerine 2947 N). | standart şartı |
| 1 | Yüksek | 1152–1156, 2431–2435 | Çekiş: boş kabin durumunda T1/T2 yer değiştirmiyor (5.11.3 Not 1); karşı ağırlık tarafı ağır durum hiç hesaplanmıyor. Örnek P=500, Q=1000, Mkw=1000: 121,8° yerine 150,9° gerekir. Halat kütlesi konuma/askı oranına bağlı değil. | standart şartı |
| 2 | Yüksek | 1095–1105, 1595–1597, 1635 | Ø6,5×210/240 `pass:true` ile “UYGUN” sayılıyor. EN 81-20 5.5.1.2 a) (≥ 8 mm), 5.5.2.1 (D/d ≥ 40), Şekil 10 aralığı (34–80) ve NB-L/REC 2/026-06 (eğilme deneyi) ile çelişir. | AVES kabulü ≠ norm |
| 3 | Düşük | 1122, 1603 | Sonlandırma verimi sabit 0,8 “hesaplanan” gibi gösteriliyor (EN 13411-3/-6/-7/-8 için %80 varsayımı Not'tadır; ölçüm değil). | sunum |
| 4 | Orta | 1245, 1336, 1439–1447 | Emniyet tertibatı tipi hızdan türetiliyor; k1 sertifikadan alınmalı (Çizelge 14: 5/3/2). Karşı ağırlık rayı kabinin k1'ini kullanıyor; 5.6.2.1.2.3'e göre 1 m/s'ye kadar anlık olabilir. | standart şartı |
| 6 | Orta | 1022–1032 | 2:1 için “2 basit bükülme” sabit; Ek D.1 şemasında 3. E.2 (1:1 + saptırma makarası) ve E.3 (çift sarım) kapsam dışı/BLOKE. | standart örneği |
| 8 | Gözlem | verify_pilot.py:530–560 | Zorlu 2,0 m/s: üretici stroku 247 mm < 0,0674·v² = 269,6 mm; “üretici satırı UYGUN” kabulü 5.8.2.2.1 ile çelişir (“toplam olası strok” tanımı üreticiden netleştirilmeli). | AVES kabulü ≠ norm |
| — | Geri çekildi | 1035 | V-oluk Nequiv(t) tablosu doğru (Çizelge 2 ile birebir). | — |

## 5. Sıradaki iş (öncelik sırasıyla)

1. **İkinci kişi teknik gözden geçirme** (kural başına; `catalog.mjs` → `DONE`). İngilizce EN 81-50:2020 ile karşılaştırma.
2. Çekiş: m_DP ve PTD atalet terimleri; makine altta yerleşim (Şekil 9 b); konuma bağlı halat kütlesi yardımcısı.
3. Fren/makine (5.9.2.2.2): standart formül vermiyor → onaylı AVES yöntemi kararı (MUHENDISLIK_KABULU) gerekli.
4. Ray: karşı ağırlık flanşı; ray yönelimi/Fx–Fy eşlemesi kararı (`flangeForceBasis`); anlık emniyet tertibatı kütle formülü (EN 81-50 5.3.2).
5. Bileşen veri kayıtları (halat/ray/tampon/regülatör) — `COMPONENT_DATA_SCHEMA` biçimiyle, belge karması ve süre/izlenebilirlik kapıları.
6. Arayüz (form girişi) — Saha uygulamasından **ayrı** tutulacak mı kararı.

## 6. Doğrulanması gereken kararlar (tahminle çözülmedi)

- Hesap motoru bu depoda kalıcı mı kalacak, ayrı depoya mı taşınacak? (Saha PWA'sıyla yaşam döngüsü farklı.)
- Rapor üstündeki imza yetkilileri ve rapor numaralandırma ÜB doküman sistemine nasıl bağlanacak?
- Flanş kuvveti tabanı varsayılanı: `envelope` (muhafazakâr) mı, `x` (standart formülü) mı?
- AVES Ø6,5 mm istisnası: kaldırılacak mı, yoksa üretici eğilme dayanım raporu ile `REVIEW` olarak mı sürecek?
- Tampon: “üretici strok satırı kabul” politikası norm ile çelişiyor (bulgu 8) — AVES politikası mı, norm mu?

## 7. Test beklentisi

`npm test` (statik test, yeşil kalır) ve `npm run test:hesap` (104 test). Yeni kural eklerken: önce bağımsız el hesabı +
sınır altı/sınır/sınır üstü + eksik veri + katalog kaydı; testin geçmesi mevzuat uygunluğu kanıtı değildir.

## 8. Doğrulanmayanlar / yapılmayanlar

- İngilizce EN 81-50:2020 aslıyla satır satır karşılaştırma yapılmadı.
- Gerçek proje dosyasıyla regresyon yapılmadı (yalnız sentetik örnek).
- Word/Excel/PDF çıktı doğrulaması yok (HTML tarayıcıda görsel kontrol edildi).
- Canlı Supabase/Cloudflare'e dokunulmadı; migration yok; RLS etkilenmedi.
