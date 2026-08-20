// Idempotent source-data repair for named fields printed in ÜB.FR.38/39.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libraryPath = path.join(root,'data','madde_kutuphanesi.json');
const library = JSON.parse(fs.readFileSync(libraryPath,'utf8'));
const byId = new Map(library.map(row => [row.madde_id,row]));

const additions = {
  'MAD-0008A': [
    {id:'kabin_tampon_yuksekligi',etiket:'Kabin tampon yüksekliği',birim:'mm',tur:'sayi',kaynak:'ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri',referans_metni:'Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez.'},
    {id:'kuyu_dibi_yuksekligi',etiket:'Kuyu dibi yüksekliği',birim:'mm',tur:'sayi',kaynak:'ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri',referans_metni:'Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez.'},
  ],
  'MAD-0008D': [
    {id:'kabin_genisligi',etiket:'Kabin genişliği',birim:'mm',tur:'sayi',kaynak:'ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri',referans_metni:'Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez.'},
    {id:'kabin_derinligi',etiket:'Kabin derinliği',birim:'mm',tur:'sayi',kaynak:'ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri',referans_metni:'Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez.'},
  ],
};
for (const [id,fields] of Object.entries(additions)) {
  const row=byId.get(id); if(!row) throw new Error(`${id} bulunamadı`);
  row.olcum_tanimlari=Array.isArray(row.olcum_tanimlari)?row.olcum_tanimlari:[];
  for (const field of fields) if(!row.olcum_tanimlari.some(item=>item.id===field.id)) row.olcum_tanimlari.push(field);
}
fs.writeFileSync(libraryPath,JSON.stringify(library),'utf8');

function fieldMap(field) { return {id:field.id,label:field.etiket,unit:field.birim,type:field.tur,source_path:`saha_kontrol.olcum_degerleri.${field.id}`}; }
function updateMapping(filename,formCode,revision,ids) {
  const targetPath=path.join(root,'form-mappings',filename); const data=JSON.parse(fs.readFileSync(targetPath,'utf8'));
  for (const id of ids) {
    const source=byId.get(id); let entry=data.measurement_mappings.find(item=>item.madde_id===id);
    if(!entry) {
      entry={madde_id:id,app_sira_no:source.sira_no,app_bolum:source.bolum,standart_madde_no:source.standart_madde_no,kontrol_basligi:source.kontrol_basligi,source_mode:'structured',source_fields:[],target:{form_code:formCode,revision,section:'TEMEL KUYU TASARIM ÖLÇÜLERİ',cell:'named_measurement_field'},serialization:{emit_only_present:true,multiple_values:'one_labeled_line_per_value',unit_policy:'preserve_captured_unit_no_automatic_conversion'},mapping_status:'verified_by_form_and_checklist_mapping'};
      data.measurement_mappings.unshift(entry);
    }
    entry.source_fields=source.olcum_tanimlari.map(fieldMap);
    entry.target={form_code:formCode,revision,section:'TEMEL KUYU TASARIM ÖLÇÜLERİ',cell:'named_measurement_field'};
  }
  data.summary={...(data.summary||{}),measurement_mapping_count:data.measurement_mappings.length};
  fs.writeFileSync(targetPath,JSON.stringify(data,null,2)+'\n','utf8');
}
updateMapping('ub-fr-38-r04.measurement-mapping.json','ÜB.FR.38','R.04',['MAD-0008A','MAD-0008B','MAD-0008C','MAD-0008D']);
updateMapping('ub-fr-39-r02.measurement-mapping.json','ÜB.FR.39','R.02',['MAD-0008A','MAD-0008B','MAD-0008D','MAD-0008E']);
console.log('Named measurement fields and mappings are complete.');
