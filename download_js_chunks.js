const fs = require('fs');
const path = require('path');

const targetDir = 'D:/My Apps/Datagan Course/assets';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// All chunks listed in the console errors
const jsFiles = [
  'DefaultLayout-fj3jNKpK.js',
  '_plugin-vue_export-helper-DlAUqK2U.js',
  'AdminIcon-BMh941ea.js',
  'CowIcon-Dh48VTOa.js',
  'usePlan-C04wLUGm.js',
  'ViewDasboard-lCBkxW7H.js',
  'EficienciaHectareaWidget-BwpjNFI3.js',
  'useEficienciaData-CPfiRCQ-.js',
  'CostosProduccionWidget-C_-lhrt3.js',
  'useCostosData-X9mu0FnN.js',
  'FlujoCajaWidget-CdNMbqrF.js',
  'BenchmarkingWidget-DKJ-gPic.js',
  'useReproduccionData-Dt7cvkQt.js',
  'ProduccionLecheEChart-Bj3A5aOB.js',
  'vacunas-CfTg3DXE.js',
  'useSaludData-CxIiKV-T.js',
  'chart-tooltip-helpers-Dhs_gL7b.js',
  'PotrerosStatusEChart-BxNkQrFi.js',
  'index-EPTJxLqn.js',
  'vendor-Bf44PGYZ.js',
  'api-BW0OyXqw.js',
  'RendimientoTab-BUfcJZMZ.js',
  'GeografiaTab-DT7nphWh.js',
  'AvanzadoTab-ChC7qGXm.js',
  'GestionOperativaTab-CaCZREVo.js',
  'TopsTab-BCI1mbsn.js',
  'PesajeEChart-PQgQifFY.js',
  'ActividadesEChart-jAN4bjEg.js',
  'IngresosEgresosEChart-C8WJ7x8T.js',
  'TendenciaFinancieraEChart-Dhr6Wm_f.js'
];

async function downloadAll() {
  console.log(`Starting download of ${jsFiles.length} JavaScript modules...`);
  for (const file of jsFiles) {
    const url = `https://datagan360.com/assets/${file}`;
    const dest = path.join(targetDir, file);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        fs.writeFileSync(dest, text, 'utf8');
        console.log(`✅ Downloaded: ${file} (${text.length} bytes)`);
      } else {
        console.warn(`⚠️ Error ${res.status} fetching ${file}`);
      }
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
    }
  }
  console.log('Finished downloading JS chunks!');
}

downloadAll();
