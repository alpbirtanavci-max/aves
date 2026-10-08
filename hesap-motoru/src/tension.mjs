// Halat gerilmeleri T1/T2 — EN 81-50:2020 5.11.3 (genel durum, makine üstte), a = ivme/gecikme.
//
// Kapsam (v1): makine kuyu üstünde; sürtünme kuvvetleri FR sıfır alınır (standart, asgari sürtünme
// garanti edilemiyorsa FR'nin tüm durumlarda silinmesini tavsiye eder); çekme kasnağı tarafı saptırma
// makarası (m_DP) ve gergi aygıtı (PTD) atalet terimleri modellenmez — bunlar beyan edilirse
// çağıran taraf sonucu REVIEW'e düşürür (bkz. traction.mjs).
//
// Doğrulama: Ek D (2:1, telafisiz) sembolik örneği ve Şekil 9 genel formülleri.
//   T_kabin = (P + Q' + M_CRkabin + M_Trav)/r·(g + s·a) + M_Comp/(2r)·g
//             + M_SRkabin·(g + s·a·(r²+2)/3) + s·Σ(adet·m_P·a)/r
//   T_kw    = (M_kw + M_CRkw)/r·(g − s·a) + M_Comp/(2r)·g
//             + M_SRkw·(g − s·a·(r²+2)/3) − s·Σ(adet·m_P·a)/r
// s = +1: kabin tarafı aşağı yönde yavaşlıyor (kabin ağır taraf); s = −1: kabin yukarı yönde yavaşlıyor.
// Statik durumlarda a = 0 alınır (standart: kabin yükleme ve durma durumları için a = 0).

import { G_N, isFiniteNumber } from './core.mjs';

/**
 * @param {object} m kütle girdileri (kg)
 * @param {number} m.P            boş kabin ve kabinin taşıdığı bileşenler
 * @param {number} m.Q            kabine uygulanan yük (yükleme durumunda 1,25·Q + idare aygıtı çağıranca verilir)
 * @param {number} m.Mcwt         karşı ağırlık (makaralar dahil)
 * @param {number} m.r            askı oranı (halat donanım oranı)
 * @param {number} m.MSRcar       kabin tarafı askı halatlarının gerçek kütlesi (tüm halatlar)
 * @param {number} m.MSRcwt       karşı ağırlık tarafı askı halatlarının gerçek kütlesi
 * @param {number} [m.Mtrav=0]    hareketli kablonun kabin tarafından taşınan kısmı
 * @param {number} [m.McrCar=0]   telafi halat/zincirinin kabin tarafı kütlesi
 * @param {number} [m.McrCwt=0]
 * @param {number} [m.Mcomp=0]    telafi kütlesi (makaralar ve gergi dahil)
 * @param {Array<{count:number, reducedMassKg:number}>} [m.carPulleys]  kabin tarafı makaralar (azaltılmış kütle)
 * @param {Array<{count:number, reducedMassKg:number}>} [m.cwtPulleys]
 * @param {number} a   ivme/gecikme (m/s²), ≥ 0
 * @param {1|-1} s     işaret (bkz. üst açıklama)
 */
export function tensions(m, a, s) {
  const r = m.r;
  const Mtrav = m.Mtrav ?? 0;
  const McrCar = m.McrCar ?? 0;
  const McrCwt = m.McrCwt ?? 0;
  const Mcomp = m.Mcomp ?? 0;
  const k = (r * r + 2) / 3;
  const pulleyTerm = (list) =>
    (list ?? []).reduce((sum, p) => sum + p.count * p.reducedMassKg * a, 0) / r;

  const car =
    ((m.P + m.Q + McrCar + Mtrav) / r) * (G_N + s * a) +
    (Mcomp / (2 * r)) * G_N +
    m.MSRcar * (G_N + s * a * k) +
    s * pulleyTerm(m.carPulleys);

  const cwt =
    ((m.Mcwt + McrCwt) / r) * (G_N - s * a) +
    (Mcomp / (2 * r)) * G_N +
    m.MSRcwt * (G_N - s * a * k) -
    s * pulleyTerm(m.cwtPulleys);

  return { car, cwt };
}

/**
 * Karşı ağırlığın (veya kabinin) tamponda durduğu statik durum.
 * stalled = 'cwt'  → karşı ağırlık tamponda: halat kuvveti yalnız halat kütlesi (D.1: T2 = M_SRkw·g)
 * stalled = 'car'  → kabin tamponda: kabin tarafı yalnız halat kütlesi
 * Telafi (Mcomp) şekil 9 genel durum yapısına göre iki tarafa M_Comp/(2r)·g olarak girer.
 */
export function stalledTensions(m, stalled) {
  const r = m.r;
  const Mtrav = m.Mtrav ?? 0;
  const McrCar = m.McrCar ?? 0;
  const McrCwt = m.McrCwt ?? 0;
  const Mcomp = m.Mcomp ?? 0;
  const comp = (Mcomp / (2 * r)) * G_N;
  if (stalled === 'cwt') {
    return {
      car: ((m.P + McrCar + Mtrav) / r) * G_N + comp + m.MSRcar * G_N,
      cwt: m.MSRcwt * G_N + comp,
    };
  }
  if (stalled === 'car') {
    return {
      car: m.MSRcar * G_N + comp,
      cwt: ((m.Mcwt + McrCwt) / r) * G_N + comp + m.MSRcwt * G_N,
    };
  }
  throw new Error(`stalled 'car' veya 'cwt' olmalı: ${stalled}`);
}

/** Ek: halat kütlesi M = birim kütle(kg/100 m) · uzunluk(m) · halat adedi / 100 */
export function ropeMassKg({ unitMassKgPer100m, lengthM, ropeCount }) {
  if (![unitMassKgPer100m, lengthM, ropeCount].every(isFiniteNumber)) return NaN;
  return (unitMassKgPer100m * lengthM * ropeCount) / 100;
}
