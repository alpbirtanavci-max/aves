# CLAUDE.md

Ortak çalışma kuralları **`AGENTS.md`** dosyasındadır — Claude ve Codex için tek kaynak.
Bir işe başlamadan önce `AGENTS.md` ve
`work/r15d-rc1-unified/CLAUDE_CODE_AVES_MASTER_BRIEF.md` dosyalarını oku.

Hızlı hatırlatma:
- Uygulama kökü: `work/r15d-rc1-unified/`
- Statik test: `node work/r15d-rc1-unified/tests/r15d-static-test.mjs` (her zaman yeşil)
- Migration dizini: `work/r15d-rc1-unified/database/` — başlamadan önce sıradaki numarayı doğrula (`ls database/ | sort | tail -1`)
- Production dalı: `claude/aves-saha-denetim-brief-4x9wxx` — doğrudan yazma, branch + PR kullan
- RLS değişikliği → `work/r15d-rc1-unified/tests/RLS_TEST_CHECKLIST.md` senaryolarını dört persona / dört ayrı test kimliğiyle çalıştır (A ilk denetçi, B yönetim, C atanmış 2. mühendis, D ilgisiz mühendis)
