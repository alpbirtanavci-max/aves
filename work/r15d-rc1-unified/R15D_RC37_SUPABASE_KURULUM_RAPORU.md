# R15D-rc3.7 Supabase kurulum raporu

Kurulum tarihi: 20 Ağustos 2026

Supabase proje kimliği: `jmccmkqyncunpqliqvox`

Migration: `database/42_r15d_rc37_yetki_takip_duzeltme.sql`

Migration SHA-256: `27989FAB8D067C31DEAA4C621E4164EF9886095768BF3235AF4E35FB22F169AE`

## Geçiş öncesi durum

- 4 aktif mühendis
- 1 aktif teknik müdür
- 1 aktif yönetici
- 3 denetim
- 1.884 saha kontrol satırı
- 62 değişiklik geçmişi satırı
- 1.019 kütüphane maddesi
- 11 kütüphane bölüm sürümü
- Mevcut üç denetimin durumu: `Devam Ediyor`

## Geri dönüş kopyası

Şema: `aves_backup_r15d_rc37_20260820_1117`

Kopyalananlar:

- Altı kritik uygulama tablosunun verileri
- 12 RLS politika tanımı
- 12 fonksiyon tanımı
- 8 tetikleyici tanımı
- 10 indeks tanımı
- 18 kısıt tanımı
- Sayım ve oluşturma zamanı manifesti

Yedek şemasındaki tablolar RLS etkin olarak oluşturuldu. `auth.users` parolaları
veya kimlik doğrulama sırları kopyalanmadı; migration bu alanlara dokunmuyor.

## Migration sonrası doğrulama

- 16 yeni rc3.7 sütunu mevcut.
- 8 rc3.7 fonksiyonu mevcut.
- 3 rc3.7 koruma tetikleyicisi etkin.
- Önceki geniş `denetim okuma` politikası kalmadı.
- Yeni SELECT politikası: `aves_denetim_gorebilir_mi(olusturan_email)`.
- Profil, kütüphane, denetim, saha cevabı ve geçmiş sayıları geçiş öncesiyle aynı.
- Migration sırasında canlı denetim veya cevap satırı silinmedi ya da toplu değiştirilmedi.

## Gerçek RLS oturum simülasyonu

Supabase üzerinde `authenticated` rolü ve veritabanındaki aktif profil
kimlikleriyle doğrulandı:

| Rol | Tüm denetimleri görür | Kendi adına oluşturur | Başkası adına oluşturur | Başkasının denetimini düzeltir |
|---|---:|---:|---:|---:|
| Mühendis | Hayır | Evet | Hayır | Hayır |
| Teknik müdür | Evet | Hayır | Hayır | Evet |
| Yönetici | Evet | Evet | Evet | Evet |

Mühendis oturumunda başka denetimlere bağlı saha cevabı veya değişiklik geçmişi
sızıntısı bulunmadı. Teknik müdür ve yönetici üç mevcut denetimin tamamını gördü.

## Yayın durumu

Bu rapor oluşturulduğunda Supabase migration tamamlanmış, Cloudflare uygulama
paketi ise henüz rc3.7'ye yükseltilmemiştir. Ön yüz yayını ayrı adım olarak
uygulama testlerinden sonra yapılmalıdır.
