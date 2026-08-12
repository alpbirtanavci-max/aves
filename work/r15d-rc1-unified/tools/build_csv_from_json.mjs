import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const rows = JSON.parse(await fs.readFile(path.join(rootDir, 'data/madde_kutuphanesi.json'), 'utf8'));
const headers = [
  'MaddeID','SiraNo','Bolum','StandartGrubu','KaynakTuru','StandartMaddeNo',
  'KontrolBasligi','DenetciYonlendirmesi','YontemKodu','DogrulamaYontemi',
  'HazirSecenekler','Olcu1Adi','Olcu1Birimi','Olcu2Adi','Olcu2Birimi',
  'TahrikKosulu','MDKosulu','EsikDeger','EsikOperator','Aktif','AranmazKosulu',
  'GorselReferansi','OlcumTanimlariJSON','OtomatikAranmazKuraliJSON',
  'ResmiMaddeMetni','KaynakFormKodu','KaynakFormRevizyonu',
  'KaynakFormTabloNo','KaynakFormSatirNo','DenetimProfilleriJSON',
  'KaynakFormBolumu','KaynakFormAltGrubu',
];
const keys = [
  'madde_id','sira_no','bolum','standart_grubu','kaynak_turu','standart_madde_no',
  'kontrol_basligi','denetci_yonlendirmesi','yontem_kodu','dogrulama_yontemi',
  'hazir_secenekler','olcu1_adi','olcu1_birimi','olcu2_adi','olcu2_birimi',
  'tahrik_kosulu','md_kosulu','esik_deger','esik_operator','aktif','aranmaz_kosulu',
  'gorsel_referansi','olcum_tanimlari','otomatik_aranmaz_kurali',
  'resmi_madde_metni','kaynak_form_kodu','kaynak_form_revizyonu',
  'kaynak_form_tablo_no','kaynak_form_satir_no','denetim_profilleri',
  'kaynak_form_bolumu','kaynak_form_alt_grubu',
];
const escape = (value) => {
  let text = value == null ? '' : String(value);
  if (typeof value === 'object') text = JSON.stringify(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const lines = [headers.join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))];
await fs.writeFile(path.join(rootDir, 'data/madde_kutuphanesi.csv'), `${lines.join('\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({ rows: rows.length, columns: headers.length }));
