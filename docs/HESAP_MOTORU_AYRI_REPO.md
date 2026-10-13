# Hesap motoru ayrı repoya taşındı

**Yeni yer:** https://github.com/alpbirtanavci-max/aves-hesap-motoru (private)

`hesap-motoru/` klasörü bu repodan (saha uygulaması) **commit geçmişiyle birlikte** ayrıldı.
Saha uygulaması (`work/r15d-rc1-unified/`) ile hesap motoru birbirine kod düzeyinde
bağımlı değildi; yalnız CI işi, kök `package.json` içindeki `test:hesap` script'i ve bir
brief belgesi paylaşılıyordu — üçü de taşındı/kaldırıldı.

## Kural

- Hesap motoru işi (standart formülleri, ray/halat/tampon katalogları, hesap raporu)
  **yalnız o repoda** yapılır; bu repoya `hesap-motoru/` klasörü geri eklenmez.
- Saha uygulaması hesap motorunu çağırmaz; ileride entegrasyon istenirse ayrı bir karar
  ve brief gerekir (veri sınırı: hesap sonucu "taslak", uygunluk kararı değil).
- Bu repoda açık hesap PR'ları kapatıldı; eşdeğerleri yeni repoda açıldı
  (aves-hesap-motoru #1, #2, #3).
