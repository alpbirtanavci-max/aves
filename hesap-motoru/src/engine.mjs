// Orkestratör: proje girdisinden tüm modülleri çalıştırır.
// Girdi bölümü verilmemişse ilgili modül hiç çalışmaz ve rapora "hesaplanmadı" olarak girer
// (sessizce atlanmaz, kapsam özetinde görünür).

import { checkSuspension } from './suspension.mjs';
import { checkTraction } from './traction.mjs';
import { checkCarRails, checkCounterweightRails } from './rails.mjs';
import { checkRailCatalogScope, resolveRailInput } from './rail-catalog.mjs';
import { checkProgressiveSafetyGear, checkGovernor, checkBuffers } from './safety.mjs';

function runRailModule(data, allInputs, position) {
  const resolved = resolveRailInput(data);
  const ratedSpeedMps = data.ratedSpeedMps ?? allInputs?.traction?.ratedSpeedMps;
  const calculationResults = position === 'car'
    ? checkCarRails(resolved)
    : checkCounterweightRails(resolved);
  const catalogueResult = checkRailCatalogScope(resolved, ratedSpeedMps, position);
  return catalogueResult ? [...calculationResults, catalogueResult] : calculationResults;
}

export const MODULES = Object.freeze([
  { key: 'suspension', label: 'Askı (halat, D/d, güvenlik katsayısı, sonlandırma)', run: checkSuspension },
  { key: 'traction', label: 'Çekiş (tahrik yeteneği)', run: checkTraction },
  { key: 'carRails', label: 'Kabin kılavuz rayı', run: (data, inputs) => runRailModule(data, inputs, 'car') },
  { key: 'counterweightRails', label: 'Karşı ağırlık kılavuz rayı', run: (data, inputs) => runRailModule(data, inputs, 'counterweight') },
  { key: 'safetyGear', label: 'Kademeli emniyet tertibatı', run: checkProgressiveSafetyGear },
  { key: 'governor', label: 'Hız regülatörü', run: checkGovernor },
  { key: 'buffers', label: 'Tamponlar', run: checkBuffers },
]);

/**
 * @param {object} inputs  modül anahtarlarına göre girdiler
 * @returns {{results: object[], modules: Array<{key,label,ran:boolean}>}}
 */
export function runCalculations(inputs) {
  const results = [];
  const modules = [];
  for (const m of MODULES) {
    const data = inputs?.[m.key];
    if (data === undefined || data === null) {
      modules.push({ key: m.key, label: m.label, ran: false });
      continue;
    }
    modules.push({ key: m.key, label: m.label, ran: true });
    results.push(...m.run(data, inputs));
  }
  return { results, modules };
}
