# EN 81-20:2020 / EN 81-50:2020 — Doğrulanmış formül notu (taslak)

Kaynak: Drive klasörü "DIŞ KAYNAKLI DOKÜMANLAR". EN 81-20 için BS EN 81-20-2020.pdf (İngilizce metin).
EN 81-50 için TS EN 81-50:2021 Türkçe çeviri (sayfa üstbilgisi EN 81-50:2020); denklemler sayfa görüntüsünden okundu.
BS EN 81-50-2020.pdf taranmış görüntü olduğundan metin çıkarılamadı. Sayısal değerler mühendis incelemesinde
İngilizce aslıyla bir kez daha karşılaştırılmalıdır. Bu not uygunluk beyanı değildir.

## 5.12 Askı halatı güvenlik katsayısı (EN 81-50:2020)
- Sf = 10^( 2,6834 − log10( 695,85·10^6 · Nequiv / (Dt/dr)^8,567 ) / log10( 77,09 · (Dt/dr)^−2,894 ) )
- Nequiv = Nequiv(t) + Nequiv(p);  Nequiv(p) = Kp·(Nps + 4·Npr);  Kp = (Dt/Dp)^4
- Dp = çekme kasnağı dışındaki tüm makaraların ortalama çapı.
- Ters eğilme: iki ardışık makara arası temas mesafesi < 200·d VE eğilme düzlemleri > 120° dönmüşse.
- Çizelge 2, V oluk (γ): 35→18,5; 36→16; 38→12; 40→10; 42→8; 45→6,5; 50→5.
  U alttan kesik (β): 75→2,5; 80→3,0; 85→3,8; 90→5,0; 95→6,7; 100→10,0; 105→15,2.
  Alttan kesikli olmayan U: 1. Ara açılar doğrusal enterpolasyon.
- Şekil 10 yalnız 34 ≤ Dt/dr ≤ 80 aralığını gösterir (aralık dışı = ekstrapolasyon, BLOKE/TEKNİK İNCELEME).
- Kontrol (şekil ile): (D/d=40, N=10) → 18,68; (34, 1) → 10,06; (36, 3) → 14,12.

### Ek E test vektörleri
- E.1: 2:1, V oluk γ=40°, Dt=600, Dp=500, Nps=2, Npr=0 → Nt=10, Kp=2,07, Np=4,14, Nequiv=14,14 (2,0736 → 14,1472).
- E.2: 1:1, U alttan kesik β=90°, Dt=600, Dp=400, Nps=1 → Nt=5, Kp=5,06, Np=5,06, Nequiv=10,06 (10,0625).
- E.3: 1:1 çift sarım, U oluk, Dt=Dp=400 → Nt=1+1, Kp=1, Np=1·(1+1)=2, Nequiv=4.

## 5.5 (EN 81-20:2020)
- 5.5.1.2 a) halat anma çapı ≥ 8 mm. 5.5.2.1 D/d ≥ 40 (sarım sayısından bağımsız).
- 5.5.2.2 güvenlik katsayısı alt sınırı: ≥3 halat sürtünme: 12; 2 halat: 16; tambur/hidrolik halat: 12; zincir: 10; ayrıca EN 81-50 5.12.
- Tanım: tek halatın asgari kopma yükü / bu halattaki en büyük kuvvet (kabin en alt katta, anma yükünde).
- 5.5.2.3 sonlandırma ≥ %80 MBL; EN 13411-3, -6, -7, -8 için %80 varsayılabilir.
- 5.5.3 çekiş koşulları: a) %125 yükle kat seviyesinde kayma yok; b) acil frende boş/dolu kabin tamponların tasarım hızına iner;
  c) kabin/karşı ağırlık sıkışırsa halat kayar veya makine elektrikli güvenlik düzeniyle durur.

## 5.11 Çekiş (EN 81-50:2020)
- Yükleme ve acil fren: T1/T2 ≤ e^(f·α). Karşı ağırlık/kabin durması: T1/T2 ≥ e^(f·α).
- Yükleme: %125 Q, kuyu içi konuma göre en kötü durum. Acil fren: a ≥ 0,5 m/s² (veya tampon tasarım hızına izin veren min), boş ve dolu.
  Durma: boş kabin, en yüksek ve en alçak konum. Boş kabinde Q silinir ve T1/T2 yer değiştirir (Not 1).
- μ: yükleme 0,1; acil fren 0,1/(1+v/10) (v = anma hızındaki halat hızı, m/s); karşı ağırlık durması 0,2.
- Yarım daire alttan kesik (β alttan kesik açısı, γ oluk açısı): f = μ·4(cos(γ/2) − sin(β/2)) / (π − β − γ − sinβ + sinγ), β ≤ 105°.
- V oluk: yükleme/acil fren, sertleştirilmemiş: f = μ·4(1 − sin(β/2)) / (π − β − sinβ);
  sertleştirilmiş: f = μ / sin(γ/2). Karşı ağırlık durması (her ikisi): f = μ / sin(γ/2). γ ≥ 35°, β ≤ 105°.
- Genel durum (Şekil 9, 5.11.3): T1, T2 için ivme (a), makara azaltılmış kütleleri, gergi aygıtı, sürtünme (FR), telafi, halat kütleleri
  (M_SRcar, M_SRcwt konuma bağlı: [0,5·H ± y]·n_s·birim kütle). Denklemler PDF s.50–51 (TS s.50–51).
- Ek D (2:1, telafisiz) sembolik örnek: yükleme T1=((P+1,25Q)/2)·g + M_SRcar·g; T2=(Mcwt/2)·g.
  Durma (üst konum, boş kabin): T1=((P+M_Trav)/2)·g; T2=M_SRcwt·g.

## 5.10 Kılavuz ray (EN 81-50:2020) ve Ek C
- σm = Mm/W; Mm = 3·Fh·l/16. σ = σm = σx + σy ≤ σperm.
- σk = (Fv + k3·Maux)·ω / A; λ = lk/i_min, lk = l (braket aralığı); ω polinomları Rm=370 ve Rm=520 için (20 ≤ λ ≤ 250);
  370<Rm<520 arası: ωR = [(ω520 − ω370)/(520−370)]·(Rm − 370) + ω370.
  ω370: ≤60: 0,00012920·λ^1,89+1; ≤85: 0,00004627·λ^2,14+1; ≤115: 0,00001711·λ^2,35+1,04; >115: 0,00016887·λ^2.
  ω520: ≤50: 0,00008240·λ^2,06+1,021; ≤70: 0,00001895·λ^2,41+1,05; ≤89: 0,00002447·λ^2,36+1,03; >89: 0,00025330·λ^2.
- Birleşik: σ = σm + (Fv + k3·Maux)/A ≤ σperm;  σ = σk + 0,9·σm ≤ σperm.
- Flanş: döner pabuç σF = 1,85·Fx/c²; kayar pabuç σF = 6·Fx·(h1 − b − f) / (c²·(l + 2·(h1 − f))).
- Sehim: δy = 0,7·Fy·l³/(48·E·Ix) + δstr-y; δx = 0,7·Fx·l³/(48·E·Iy) + δstr-x.
- EN 81-20 5.7.4: k1 = 5 (anlık, kenetli makaralı değil), 3 (anlık kenetli makaralı veya enerji biriktiren tampon etkili), 2 (kademeli / enerji dağıtan tampon / patlama valfi);
  k2 = 1,2; k3 üreticiden. Çizelge 15: normal çalışma A5>12 %: 2,25; 8–12 %: 3,75; emniyet tertibatı A5>12 %: 1,8; 8–12 %: 3,0; A5<8 % kullanılamaz.
  σperm = Rm/St. Sehim: 5 mm (emniyet tertibatı etkili raylar), 10 mm (emniyet tertibatsız karşı ağırlık).
- Ek C.2.1 (emniyet tertibatı): Fx = k1·g·(Q·xQ + P·xP)/(n·h); Fy = k1·g·(Q·yQ + P·yP)/((n/2)·h); xQ = xC + Dx/8 (veya yQ = yC + Dy/8);
  konumlar RAY KOORDİNAT SİSTEMİNE göre (askı noktası S'e göre DEĞİL).
  Fv = k1·g·(P+Q)/n + Mg·g + Fp.
- Ek C.2.2 (normal çalışma): Fx = k2·g·[Q·(xQ − xS) + P·(xP − xS)]/(n·h); Fy benzer, n/2; Fv = Mg·g + Fp.
- Ek C.2.3 (yükleme): Fx = [g·P·(xP − xS) + Fs·(xi − xS)]/(n·h); Fy benzer; Q yok.
- 5.10.2.3/4/5: >2 özdeş ray ise kuvvet eşit; birden çok emniyet tertibatı eşit paylaşım; çok katmanlı tertibat tek noktada.

## 5.8.2 Tampon stroku (EN 81-20:2020)
- Doğrusal enerji biriktiren: s ≥ 0,135·v² (≥ 65 mm); statik yük 2,5–4 × (P+Q) altında bu stroku karşılamalı.
- Doğrusal olmayan: 5.8.2.1.2 performans şartları (ortalama yavaşlama ≤ 1 gn; >2,5 gn en çok 0,04 s; dönüş hızı ≤ 1 m/s; kalıcı deformasyon yok; tepe ≤ 6 gn).
- Enerji dağıtan: s ≥ 0,0674·v²; 2,50 m/s üzerinde son durak yavaşlaması izlenirse temas hızıyla hesap, strok ≥ 0,42 m.

## 5.6.2.1.2 Emniyet tertibatı kullanımı
- Kabin: kademeli, veya anma hızı ≤ 0,63 m/s ise anlık olabilir.
- Karşı ağırlık/denge ağırlığı: anma hızı > 1 m/s ise kademeli; aksi halde anlık olabilir.
- Aynı kabin/karşı ağırlıkta birden çok tertibat varsa hepsi kademeli.
- Kademeli tertibatta ortalama yavaşlama 0,2–1 gn.

## 5.7.2 Ray kuvvetleri ve yük durumları (EN 81-20:2020) — 2. tur
- Yük durumları (Çizelge 13): normal çalışma-seyir (P, Q, Mcwt, Mg, Fp, Maux, WL); yükleme/boşaltma (P, Fs, Mg, Fp, Maux, WL; Q yok); emniyet tertibatı (P, Q, Mcwt, Mg, Fp, Maux; WL yok).
- 5.7.2.3.2: P'nin etki noktası, P'ye dahil parçaların (hareketli kablo, telafi, piston vb.) birleşik ağırlık merkezi.
- 5.7.2.3.3: Karşı ağırlık merkezi askılı ve kılavuzlanmışsa kütle merkezi eksantrikliği en az genişliğin %5'i ve derinliğin %10'u.
- 5.7.2.3.4: Q, kabin alanının en elverişsiz konumdaki ÜÇ ÇEYREĞİNE eşit dağıtılır (ağırlık merkezi sapması D/8). Emniyet tertibatı fren kuvveti raylara eşit dağıtılır.
- 5.7.2.3.5: Fv(kabin) = k1·g·(P+Q)/n + Mg·g + Fp; Fv(karşı ağırlık) = k1·g·Mcwt/n + Mg·g + Fp; k1 = 0 (raya etkiyen emniyet tertibatı yoksa).
  Fp = nb·Fr (çukurda dayalı veya üstten asılı ray); Fp = (1/3)·nb·Fr (serbest asılı ray). Seyir ≤ 40 m ise Fp ihmal edilebilir.
- 5.7.2.3.6: Fs = 0,4·g·Q (yolcu), 0,6·g·Q (yük-yolcu), 0,85·g·Q (ağır elleçleme cihazı, ağırlığı Q'ya dahil değilse). Kabin boş kabul edilir; birden çok girişte en elverişsizi.
  Pabuçlar braket aralığının %10'u içindeyse sill kuvvetinden eğilme ihmal edilebilir.
- 5.7.2.3.7: Maux; regülatör ve ilgili parçalar, şalterler hariç. 5.7.2.3.8: rüzgâr yükü (bina dışı, kısmen kapalı kuyu).
- 5.7.2.1.2: ray sehimi, braket sehimi, pabuç boşluğu ve ray doğruluğu birlikte değerlendirilir.

## 5.6.2.2.1 Hız regülatörü (EN 81-20:2020)
- Devreye girme: ≥ 1,15·v ve < 0,8 m/s (anlık, kenetli makaralı hariç) / < 1 m/s (kenetli makaralı) /
  < 1,5 m/s (kademeli, v ≤ 1) / < 1,25·v + 0,25/v (kademeli, v > 1).
- Halat kuvveti: max(2 × tertibatı çalıştırma kuvveti, 300 N). Halat: MBL / (μmax=0,2 ile en yüksek gerilme) ≥ 8; D/d ≥ 30.
- Çekme kasnaklı regülatör oluğu: ek sertleştirme veya EN 81-50 5.11.2.2.1'e göre alttan kesik.

## 5.3.3 Kademeli emniyet tertibatı (EN 81-50:2020) — kontrol edildi
- İzin verilen kütle (P+Q)₁ = F_B/16 (5.3.3.3.1). F_B = deneylerdeki ortalama fren kuvvetlerinin ortalaması;
  her deney ortalamadan ±%25 içinde (5.3.3.2.3.1). Tek kütle için 4 deney (v ≤ 4 m/s: parça dizisi 3 deney, > 4 m/s: 2 deney).
- Hesaplanan izin verilen kütle deney kütlesinden büyükse ve her deneyde ortalama yavaşlama ≤ 1 gₙ ise deney kütlesi alınabilir.
- 5.3.4 a): uygulanabilir kütle izin verilen kütleden ±%7,5 sapabilir. "16" ayrıca 5.3.3.1'de deney kütlesi seçimi için ÖNERİ olarak geçer (0,6 gₙ hedefi).
- Anlık tertibat (5.3.2): (P+Q)₁ = 2K/(2·gₙ·h) (elastik limit aşılmadıysa); aşıldıysa iki hesaptan yüksek olan (K₁/..., K₂ / 3,5 ile) — K eğri integrali, deney verisi gerekir.
- Tip inceleme belgesi (5.3.5): izin verilen kütle limitleri, regülatör trip hızı, ray tipi ve bıçak kalınlığı, kavrama alanı, yüzey ve yağlama (kademeli).

## 5.5 Tampon tip incelemesi (EN 81-50:2020)
- Başvuru: azami darbe hızı, asgari ve azami kütleler. Enerji dağıtan tampon: asgari ve azami kütlelerle serbest düşüş deneyi, her ikisinde yavaşlama kontrol edilir.
- Ortam +15…+25 °C. Ortalama yavaşlamada 0,5 m/s² altındaki esneme ihmal edilebilir.
- Strok/performans EN 81-20 5.8.2'de (yukarıda).

## Oku-daha-sonra listesi
- EN 81-20 5.9 makine/fren (BRK-001, %125 yük) ve 6.3; EN 81-77 (sismik); ISO 8100-33:2022 (ray malzeme tablosu);
  EN 12385-5 (halat); EN 13411 -6/-7; SORU CEVAP ANFOR "Questions & Answers to EN 81-20:2014 & EN 81-50:2014".

## 5.9.2 Makine ve fren (EN 81-20:2020) — 3. tur
- 5.9.2.2.2.1: Elektromekanik fren tek başına, kabin anma hızında AŞAĞI giderken ve anma yükü + %25 ile makineyi durdurabilmeli; kabin ortalama yavaşlaması
  emniyet tertibatı veya tampon durdurmasından doğan yavaşlamayı aşmamalı.
- Fren mekanik bileşenleri en az iki takım olmalı. Bir takım arızalıysa kalan takım: anma yükü ile anma hızında aşağı giderken yavaşlatıp durdurmalı ve tutmalı;
  boş kabin yukarı giderken de tutmalı (iki ayrı tek-takım-arızası durumu).
- 5.9.2.2.2.9: fren elle açıkken (q−0,1)Q ile (q+0,1)Q arası yükte kabin komşu kata doğal hareketle veya manuel/elektrikli acil işletmeyle gitmeli (≤150 N el kuvveti, 5.9.2.3.1 a).
- 6.3.1 deney: (a) tek başına fren, %125 Q ile aşağı; (b) bir takım devre dışı, anma yükü ile aşağı; (c) manuel açma. 6.3.3 çekiş deneyi: boş kabin yukarı (üst bölge), %125 Q aşağı (alt bölge), karşı ağırlık tamponda.
- Standart fren torku için tek bir hesap formülü vermez; yöntem mühendislik kabulüdür (MUHENDISLIK).
- 5.9.2.1.1: pozitif tahrik (tambur/zincir): anma hız ≤ 0,63 m/s, karşı ağırlık yok; tahrik elemanı hesabında kabin/karşı ağırlığın tampon üstünde durması dikkate alınır.

## ISO 8100-33:2022 ray (Drive'daki PDF'ten okundu)
- Tablo 2 (raw malzeme): GR235 ≤16 mm: UTS 370–510, YS 235, EL 26 %; >16–40 mm: YS 225. GR275 ≤16: UTS 410–520, YS 275, EL 22 %; >16–40: YS 265.
- /A (çekme): GR235'ten üretilir, nihai özellikler üretici–müşteri anlaşmasıyla. /B (işlenmiş): Tablo 2'deki sınıflardan biri.
- Tablo 5 (çekme profilleri) örnek: T89/A A=15,77 cm², 12,38 kg/m, Ix=59,83 cm⁴, Wx=14,35 cm³, ix=1,948 cm, Iy=52,41 cm⁴, Wy=11,78 cm³, iy=1,823 cm.
  T90/A Ix=102,0 cm⁴; T70/A Ix=40,95 cm⁴; T82/A Iy=30,17 cm⁴ → repo katalog değerleriyle uyumlu.

## EN 12385-5:2021 asansör halatı
- Fmin (kN) = K·d²·Rr/1000. K: 6×19 fibre çekirdek K1=0,330; 8×19 fibre K1=0,293; 8×19 çelik çekirdek K2=0,356. Çift çekme (dual tensile) için Rr yerine Rdt:
  1180/1770 fibre: 1370; 1370/1770 fibre: 1500; 1370/1770 çelik çekirdek (8×19): 1570; 1570/1770 çelik çekirdek: 1670 (Tablo A.1).
- Kontrol: 8×19 çelik, d=8, Rr=1770 → 0,356·64·1770/1000 = 40,33 kN (tablo 40,3).
- Tablo 6 (6×19) 6 ve 6,5 mm'yi içerir; ancak EN 81-20 5.5.1.2 a) askı halatı ≥ 8 mm ister (6–<8 mm yalnız hidrolik askı ve telafi halatı tolerans tablosunda).
- Çap toleransı (çelik çekirdek, ≤10 mm): +3 % / 0 (%5 Fmin'de), %10 Fmin'de −1 %; >10 mm: +2 % / 0.
- Kanıt: üretici muayene belgesi (EN 12385-1) ve tel dayanım sınıfları; kalite görsel doğrulanır.

## EN 13411-7 (simetrik kamalı soket) ve -6
- Kenetleme uzunluğu ≥ 7,3·d (13411-7). Verim ≥ %80 MBL, sokette deformasyon ve halatta kayma olmadan. Tasarım katsayısı: yük kaldırma ≥ 5, insan taşıma ≥ 10.
- Soket boyutu halat çapı aralığına bağlı: 5→4–5 mm; 6,5→5–6,5; 8→6–8; 11→9–11; 14→12–14; 17→15–17; 20→18–20. Kama/soket açısı 13°. Farklı imalatçı parçaları karıştırılmaz.
- EN 13411-6 (asimetrik kamalı soket, TS EN 13411-6+A1 Türkçe metin) okundu: kenetleme uzunluğu ≥ 4,3·d (5.1); verim ≥ %80 MBL (5.3.4); kama açısı α ile soket açısı β farkı ≤ 2°; halat yüke maruz kısmının ekseni pime dik.

## ANFOR soru-cevap (EN 81-20:2014 & EN 81-50:2014)
- Fs yorumu (5.7.2.3.6): değerler "en kötü durum"; yolcu/yük/ağır hizmet ayrımı sözleşmeye bağlıdır; farklı yükleme için onaylanmış sapma gerekebilir.
- Belgenin kalanı kapı, aydınlatma, sığınma alanı sorularıdır; hesap kuralı değişikliği içermez.

## EN 81-77:2022 sismik durum (TS EN 81-77, Eylül 2022) — ilk sürümde kapsam dışı, sonraki modül için kayıt
- Yapı: Ek A (normatif) sismik asansör kategorileri; Ek B (bilgi) tasarım ivmesi ad ve örnek hesap; Ek D (bilgi) sismik ray ispatı.
- Ek D, EN 81-20 5.7 ve EN 81-50 5.10/Ek C hesabının sismik duruma uyarlanmasıdır:
  Q_SE = k_SE·Q (k_SE = 0,4 yolcu; 0,8 yük-yolcu).  Kabin: F_SE = a_d·(P_EC + k_SE·Q);  karşı ağırlık: F_SE = a_d·(P_EC + q·Q).
  P_EC: boş kabin (hareketli kablo ve telafi hariç). Sismik yük durumunda kabin kütleleri (P_EC + Q_SE) k2 = 1,2 ile çarpılır.
  Çizelge D.1: yeni yük durumu "sismik koşul — seyir" (P_EC, Q_SE, M_cwt, M_g, F_p, M_aux, WL, F_SE). Çizelge D.2: ivme yönü (x ekseni eğilmesi için a_x = a_d, a_y = 0; y için tersi).
- 5.8.2: sismik olay sırasında izin verilen gerilme ve sehimler ayrı hükümdür (Ek D ile birlikte okunmalı); bu notta formüle edilmedi.
