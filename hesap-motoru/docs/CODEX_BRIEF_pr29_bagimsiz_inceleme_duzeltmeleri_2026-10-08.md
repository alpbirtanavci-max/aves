# PR #29 bağımsız inceleme ve düzeltme devri

Tarih: 2026-10-08
İncelenen merge: `a6723a53c5ba88aeef3a780a0363e50e80177464`
Düzeltme dalı: `codex/pr29-calculation-review-fixes`
Ürün sınırı: Motor hesap/kanıt üretir; uygunluk veya belgelendirme kararı vermez.

## İnceleme kapsamı ve korunmuş alanlar

İnceleme, PR #29'un merge commit'inden ayrılmış salt okunur checkout'ta yapıldı. `hesap-motoru/{src,tests,bin,examples,docs}`, hesap motoru brief'i, `package.json` içindeki `test:hesap` ve CI'daki hesap motoru işi incelendi. Saha PWA'sı (`work/r15d-rc1-unified`), migration ve RLS dosyalarında PR #29 değişikliği yok. Canlı Supabase/Cloudflare'e erişilmedi.

## Doğrulanan kusurlar ve bu daldaki düzeltmeler

1. `src/suspension.mjs`: eksik saptırma makarası eğilme adetleri sıfır sayılabiliyordu. Bu, `Dt/dr=40`, V oluk 40° (Çizelge 2 `Nt=10`), `d=10 mm`, `Dt=400 mm`, tek `Dp=400 mm` makara, 6 halat ve hesaplanan halat güvenlik katsayısı `S=18,75` örneğinde `Nequiv=10`, `Sf=18,6774` ve yanlış `PASS` üretiyordu. Bir basit eğilme varsa `Nequiv=11`, bağımsız 5.12.3 sonucu `Sf=19,3362`; `18,75 < 19,3362`, bu nedenle sonuç `FAIL` olmalı. Düzeltme eksik/geçersiz eğilme verisini `BLOKE` eder; Şekil 10'un `Dt/dr=34–80` dışındaki alanında değer hesaplamaz ve ekstrapolasyon yapmaz.

   Tasarım takibi: Denetçiden bükülme sınıfı/adedi istemek hedef kullanıcı akışı değildir. Gelecek adımda veri makara/halat geometrisinden veya doğrulanmış makine kaydından türetilmeli; bu kanıt yokken motor `BLOKE` kalmalı.

2. `src/traction.mjs`: açıkça verilen negatif `ropeSpeedMps` sonlu değer sayıldığı için kabul ediliyordu. Örnek `-9 m/s`, sertleştirilmiş V oluk 40°, `α=90°`, acil fren için hatalı olarak `μ=1` ve `e^(fα)=98,7608` verir; boş kabin oranı `1,4703` olduğundan `PASS` çıkabiliyordu. Fiziksel hız pozitif olmalı; girdi artık geçersizse hesap `BLOKE` olur. `v=2 m/s` için doğrudan `μ=0,1/(1+v/10)=0,083333`, `f=μ/sin(20°)=0,243693` ve `e^(fπ/2)=1,46627`; aynı oran için beklenen sonuç `FAIL`.

3. `src/rails.mjs`: negatif `Fp` ve negatif/sonlu olmayan yardımcı kuvvet `Maux` bası/burkulma hesabında azaltıcı etki yapabiliyordu. Seyir `≤40 m`, `Fp=-10000 N` örneğinde `RAIL-C-03` yanlış `PASS` idi. Bu fiziksel olmayan kuvvet girdileri artık hesaplamayı `BLOKE` eder; `k3` verildiyse sıfır/negatif veya sonlu olmayan katsayı da bloke edilir. Normatif bir `k3` alt sınırı bu incelemede doğrudan standart metninden teyit edilmedi; kod bu nedenle pozitif olma dışında daha yüksek sınır dayatmıyor.

4. `src/safety.mjs`: `slowdownMonitored: "false"` JavaScript'te doğru kabul edilip 3 m/s tampon hesabında azaltılmış 420 mm sınırını etkinleştirebiliyordu. Normal yavaşlama izleme yokken `s=0,0674·3²=606,6 mm`; 420 mm strok için beklenen sonuç `FAIL`. İzleme alanı artık boolean değilse ve varsa temas hızı pozitif/sonlu değilse `BLOKE`.

5. `src/report.mjs`: sonuç/kural içermeyen boş raporda bekleyen inceleme listesi boş olduğu için TASLAK damgası düşüyordu. Hiç kural hesaplanmadığında da rapor artık açıkça `TASLAK` işaretli.

6. Test kapsamı bu durumlar ve örnek proje girdisi için genişletildi. Sonuç etiketleri motoru uygunluk karar vericisi yapacak biçimde değiştirilmedi.

## Testler ve sınırlar

- PR #29 tabanında: `npm test` 408/408; `npm run test:hesap` 104/104.
- Düzeltme dalında: `npm test` 408/408; `npm run test:hesap` 109/109.
- Sentetik örnek CLI'si rapor üretti: 24 kriter sağlandı, 1 teknik inceleme, 0 sağlanmadı, 0 bloke; rapor `TASLAK`.
- Entegre ray test girdisiyle bağımsız Ek C hesabında `Fx=2946,67875 N`, `Fy=838,755 N`, `Fv=17952,3 N`, `λ=109,7093`, `ω370=2,106159`, `ω520=3,048750`, enterpole `ω=2,608874`, `σm=115,7221 MPa`, `Fv/A=11,3838 MPa`, `σk=29,6990 MPa` ve `Rm/1,8=250 MPa` elde edildi; kodun testteki girdileriyle uyumlu. Entegre 5.12 testinin beklenen `Sf` değeri de üretim fonksiyonu yerine doğrudan denklemden hesaplanmış `18,6773818214` sabitine bağlandı.
- EN 81-50:2020'nin yetkili tam metni/İngilizce 2020 nüshası bu incelemede yoktu. Bu nedenle telifli normatif metnin bağımsız doğrudan doğrulaması değildir; formül hesabı kullanıcı tarafından brief'te verilen denklem ve eldeki Türkçe çeviri/önceki İngilizce metin karşılaştırma notlarıyla kontrol edildi. EN ISO 8100-1/2:2026 geçişinin ulusal/uyumlaştırılmış statüsü kapsam dışı ve ayrıca teyit gerektiriyor.
- Gerçek saha projesiyle regresyon henüz yok; bu PR sentetik test ve açık girdilerle sınırlı.

## Sonraki kişi için istek

Bu PR'ı henüz merge etme. Önce bağımsız ikinci mühendis incelemesiyle özellikle EN 81-50 5.11, 5.12, Ek C/E ve EN 81-20 5.8.2 metin/formül eşleşmesini; sonra gerçek proje girdilerinin mahremiyet kontrollü regresyonunu tamamla. Eğilme verisi kullanıcıdan manuel istenecek şekilde ürünleştirilmemeli; geometri veya üretici teknik kaydıyla türetme tasarlanmalı.
