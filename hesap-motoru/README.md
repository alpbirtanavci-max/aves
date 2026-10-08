# AVES Hesap Motoru (v0.2 — taslak)

Elektrikli, halatlı asansörler için **tasarım hesabı doğrulama** motoru. EN 81-20:2020 ve EN 81-50:2020
hükümlerini saf fonksiyonlar olarak uygular, her sonucu kaynak maddesi, formül ve sayısal yerine koymayla
birlikte döndürür ve AVES adına kullanılabilecek bir **hesap raporu** üretir.

> **Sınır.** Bu bir hesap yardımcısıdır. Uygunluk değerlendirmesi, belgelendirme kararı veya standarda
> uygunluk beyanı üretmez; imza atmaz. Sonuçlar `Kriter sağlandı / Kriter sağlanmadı / Teknik inceleme /
> Bloke` olarak anılır. Ayrıntı: `AGENTS.md` bölüm 1, `work/r15d-rc1-unified/CLAUDE_CODE_AVES_MASTER_BRIEF.md` bölüm 3.
>
> **Durum.** Hiçbir kuralın ikinci kişi teknik gözden geçirmesi tamamlanmadı; rapor bu yüzden **TASLAK**
> damgasıyla çıkar (`src/catalog.mjs`). Gözden geçirme tamamlanan kural `independentReview: 'DONE'` olur.

## Kullanım

```bash
# testler (Node ≥ 22; bağımlılık yok)
npm run test:hesap

# sentetik örnekten rapor üret
node hesap-motoru/bin/hesap.mjs hesap-motoru/examples/ornek-proje.sentetik.json --out hesap-ciktisi
# → hesap-raporu.json / .md / .html  (HTML tarayıcıdan PDF'e yazdırılabilir)
```

Kütüphane olarak:

```js
import { runCalculations, buildReport, renderHtml } from './hesap-motoru/src/index.mjs';
const { results, modules } = runCalculations(inputs);
const report = buildReport({ project, results, modules, inputs, preparedAt: '2026-10-08T00:00:00Z' });
```

Motor saat okumaz (`preparedAt` çağıran verir); aynı girdi aynı rapor ve aynı girdi karmasını (SHA-256) üretir.

## Kurallar

| Modül | Kural kimlikleri | Standart |
|---|---|---|
| `car-area.mjs` | CAR-AREA-001, CAR-PAX-001 | EN 81-20 5.4.2.1 / Table 6; 5.4.2.3 / Table 8; 0.3.6 |
| `suspension.mjs` | SUS-001 … SUS-006 | EN 81-20 5.5; EN 81-50 5.12 (Çizelge 2, Şekil 10 denklemi); EN 13411 |
| `traction.mjs` + `tension.mjs` | TRA-001 … TRA-005 | EN 81-50 5.11; EN 81-20 5.5.3 |
| `rails.mjs` | RAIL-C-02…05 (kabin), RAIL-W-02/03/05 (karşı ağırlık) | EN 81-50 5.10, Ek C; EN 81-20 5.7 |
| `safety.mjs` | SG-001/002, GOV-001…003, BUF-001…003 | EN 81-50 5.3; EN 81-20 5.6, 5.8 |

Kapsam dışı olanlar rapor başlığında **açıkça** listelenir (`OUT_OF_SCOPE`); girdisi verilmeyen modül
“hesaplanmadı” olarak görünür, sessizce atlanmaz.

`inputs.carArea` alanına anma yükü (kg), 5.4.2.1.2–5.4.2.1.3'e göre ölçülmüş kullanılabilir alan (m²) ve kabinde beyan edilen kişi sayısı girilir. Motor Table 6 azami alanını ve Table 8 / Q÷75 kişi sınırını hesaplar. Girinti/uzantı ile kapı dikmeleri alanı geometriden otomatik çıkartılmaz; ölçüm kuralı rapor notlarında açıkça belirtilir.

## Tasarım ilkeleri

1. **Eksik veya geçersiz veriyle PASS yok.** Zorunlu girdi eksik/NaN/negatifse sonuç `BLOCKED` ve gerekçesi listelidir.
2. **Ekstrapolasyon yok.** Çizelge 2, ω (λ 20–250, Rm 370–520) ve benzeri tablo/aralık dışı değerler `null`/`BLOCKED`.
3. **Kaynak sınıfı her satırda:** `NORMATIF`, `URETICI_VERISI`, `AVES_POLITIKASI`, `MUHENDISLIK_KABULU`.
   AVES iç kabulleri (ör. Ø6,5 mm × 210/240 mm) norm yerine geçmez; hiçbir koşulda `PASS` vermez.
4. **Normatif katsayı kullanıcı girdisi değildir.** μ, k1/k2, emniyet katsayıları standarttan gelir; k1 emniyet
   tertibatı tipinden (sertifika) seçilir, **hızdan türetilmez**.
5. **Bitmiş ray Rm/A5** izlenebilir belge referansı olmadan kullanılamaz; hammadde UTS/EL yerine geçmez.
6. **Tekrar üretilebilirlik:** saf fonksiyonlar, saat yok, kararlı JSON karması.

## Doğrulama

- Testler beklenen değerleri modülden bağımsız olarak, standardın formüllerinden/örneklerinden **elle** hesaplar
  (EN 81-50 Ek D, Ek E.1–E.3, Şekil 10 noktaları, Ek C formülleri).
- Kaynak okuma kaydı ve formül özeti: `docs/KAYNAK_NOTLARI.md`. EN 81-50:2020 metni Türkçe çeviriden
  (TS EN 81-50:2021) ve İngilizce EN 81-50:2014 ile metin düzeyinde karşılaştırılarak okundu; **İngilizce
  EN 81-50:2020 aslıyla karşılaştırma bekliyor**.
- Testlerin geçmesi mevzuat uygunluğu kanıtı değildir; `RULE_CATALOG` içindeki `independentReview` alanı ayrıdır.

## Bilinen eksikler (v0.2)

Makine/fren (5.9), motor, kabin/karkas yapısal hesapları (kabin alanı/kişi sayısı dışındaki), hidrolik, sismik, makine altta çekiş,
`m_DP`/PTD atalet terimleri, karşı ağırlık flanş/braket kontrolleri, anlık emniyet tertibatı kütle formülü.
Tam liste: `docs/KAYNAK_NOTLARI.md` ve `docs/CLAUDE_BRIEF_hesap_motoru_2026-10-08.md`.
