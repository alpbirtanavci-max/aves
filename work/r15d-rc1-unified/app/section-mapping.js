/* AVES R15D-rc3.6 — canlı kütüphane geçişi için fiziksel bölüm güvenlik eşlemesi */
'use strict';

(function exposePhysicalSectionMapping(root) {
  const groups = {
    '00 - Ön Kontrol': [
      'MAD-0889',
    ],
    '01 - Kuyu Dibi': [
      'MAD-0859',
    ],
    '02 - Kuyu Boyunca': [
      'MAD-0845','MAD-0846','MAD-0847','MAD-0848','MAD-0850','MAD-0851','MAD-0854',
      'MAD-0860','MAD-0861','MAD-0862','MAD-0863','MAD-0864','MAD-0865','MAD-0866',
      'MAD-0867','MAD-0884','MAD-0885',
      'MAD-0900','MAD-0914','MAD-0915','MAD-0916','MAD-0917','MAD-0918','MAD-0919','MAD-0920',
    ],
    '03 - Kabin ve Kabin Üstü': [
      'MAD-0870','MAD-0871','MAD-0872','MAD-0873','MAD-0874','MAD-0875','MAD-0876',
      'MAD-0877','MAD-0878','MAD-0879','MAD-0880','MAD-0881','MAD-0882','MAD-0886',
      'MAD-0904',
    ],
    '04 - Makine ve Şase': [
      'MAD-0853',
    ],
    '05 - Elektrik ve Test': [
      'MAD-0855','MAD-0856','MAD-0857','MAD-0858','MAD-0868','MAD-0869',
      'MAD-0891','MAD-0892','MAD-0893','MAD-0894','MAD-0895','MAD-0896','MAD-0897',
      'MAD-0898','MAD-0899','MAD-0902','MAD-0903','MAD-0905','MAD-0906','MAD-0907',
      'MAD-0908','MAD-0909','MAD-0910','MAD-0911','MAD-0912','MAD-0913','MAD-0921',
    ],
  };

  const mapping = Object.freeze(Object.fromEntries(
    Object.entries(groups).flatMap(([section, ids]) => ids.map(id => [id, section]))
  ));

  if (Object.keys(mapping).length !== 70) {
    throw new Error('AVES fiziksel bölüm eşlemesi 70 madde içermiyor');
  }

  root.AVES_FIZIKSEL_BOLUM_ESLEMESI = mapping;
  root.avesFizikselBolumUygula = function avesFizikselBolumUygula(row) {
    if (!row || !mapping[row.madde_id]) return row;
    return row.bolum === mapping[row.madde_id]
      ? row
      : { ...row, bolum: mapping[row.madde_id] };
  };
})(globalThis);
