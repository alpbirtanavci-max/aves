# AGENTS.md — AVES Saha Denetim · Ortak Çalışma Kuralları

Bu dosya **Claude Code ve Codex için ortak bağlayıcı kural setidir**. Her iki ajan da
bir işe başlamadan önce bunu ve `work/r15d-rc1-unified/CLAUDE_CODE_AVES_MASTER_BRIEF.md`
dosyasını okur. Çelişki görürsen tahminle çözme; "doğrulanması gereken karar" olarak kaydet.

---

## 1. Ürün sınırı (özet)

AVES Saha, denetçiye yardımcı **operasyonel** bir araçtır. Uygunluk/belgelendirme kararı
vermez. Kodda `APPROVED`, `CERTIFIED`, `CONFORMITY_DECISION` gibi yetki aşan durumlar
üretme. Ayrıntı: Master Brief bölüm 2–4.

## 2. Çalışma düzeni

1. **Tek iş, tek geliştirici, tek branch.** Bir işi ya Claude ya Codex götürür; ikisi
   aynı dosyaya aynı anda dokunmaz. İş devri bir brief dosyasıyla yapılır
   (`CODEX_BRIEF_*.md` / `CLAUDE_BRIEF_*.md`): kanıt satır numaraları + istenen çıktı +
   test beklentisi. **Brief repo içine commit edilir** — yalnız bir kişinin yerel
   oturumunda kalırsa sonraki devirde bağlam kaybı olur. İş bitince `docs/arsiv/`e taşınır.
2. **Değişiklik her zaman branch'te yapılır.** Production dalına
   (`claude/aves-saha-denetim-brief-4x9wxx`) doğrudan yazılmaz.
3. **Diğer ajan diff'i inceler.** Merge öncesi zorunlu. Claude tarafında `/code-review high`.
4. **RLS değişikliğinde üç gerçek hesapla test yapılır:** ilk denetçi (mühendis),
   yönetim (yönetici/teknik müdür), atanmış ikinci mühendis. Bkz.
   `work/r15d-rc1-unified/tests/RLS_TEST_CHECKLIST.md`.
5. **Production'a alma yalnız kullanıcının açık onayıyla.** Önce salt okunur inceleme,
   yedek, transaction, doğrulama, geri dönüş planı.

Kısa ömürlü branch → PR → inceleme → merge → branch sil. Ölü branch biriktirme.

## 3. Migration disiplini

- Dizin: `work/r15d-rc1-unified/database/`. Numaralandırma sıralı. **Başlamadan önce
  sıradaki numarayı doğrula** (`ls database/ | sort | tail -1`); bu dosyaya sabit numara
  yazma — ilk migration'dan sonra eskir. Brief'te sıradaki numarayı açıkça belirt; iki
  ajan aynı numarayı kullanmaz.
- **Canlıda uygulanmış bir migration'ı yerinde düzenleme.** Politika/şema düzeltmesi
  yeni dosyada `drop ... if exists` + yeniden `create` ile yapılır.
- Her migration tek `begin; ... commit;` ve idempotent (`if not exists`, `if exists`).
- Kolon eklerken mevcut satır silme/`truncate` yok. Statik test bunu kontrol ediyor,
  öyle kalsın.

## 4. Sürüm bumpı — dört dosya birlikte

`app/app.js` (`APP_VERSION`), `app/index.html` (`R15D-RCx.y.z</b>`), `app/manifest.json`
(`"version"`), `app/sw.js` (`CACHE = 'aves-saha-...'`). Dördü aynı sürümü göstermezse
statik test kırmızı olur.

## 5. Test sözleşmesi

- `node work/r15d-rc1-unified/tests/r15d-static-test.mjs` **her zaman yeşil** kalır.
  Her davranış değişikliği önce testi günceller.
- **Statik testin yeşil olması RLS mantığının doğru olduğu anlamına gelmez.** Statik
  test metin arar; yetki kararını doğrulamaz.
- **Değişmez kural:** `app.js` içindeki her `canSee* / canEdit* / canDelete* / *GorunebilirMi`
  kontrolünün karşılığı bir RLS politikası olmalı. İstemci kontrolü gevşetilirse veya
  yeni bir görünürlük yolu açılırsa (ör. `takip_atanan_email`), ilgili **SELECT ve
  UPDATE** politikaları aynı PR'da güncellenir.
- RLS'e dokunan her PR, `RLS_TEST_CHECKLIST.md`'deki senaryoları bir Supabase branch'inde
  gerçek çalıştırıp sonucu PR'a ekler.

## 6. Kaynak ve dil disiplini

Her teknik hüküm Master Brief bölüm 4'teki kaynak sınıflarından birine yerleştirilir.
Kullanıcıya gösterilen dil ürün sınırını korur. Standart metni birebir kopyalama.

## 7. Araç erişimi

- Git/GitHub: PR akışı buradan.
- Supabase: **panel + komut satırı** ile erişiliyor. Canlı işlem yalnız kullanıcı açıkça
  isteyince. Ek MCP/eklenti kurmadan bu düzen yeterli.
- Cloudflare: canlıya dokunmadan önce kullanıcı onayı.

---

`CLAUDE.md` bu dosyaya yönlendirir. İki ajan da kuralları buradan okur.
