const mongoose = require('mongoose');
const Dpcars1 = require('./models/Dpcars1');
require('dotenv').config();

async function update() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI non definita nel file .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const content = `
<div class="codacons-section mb-4 p-3 border border-success rounded bg-dark" style="border-width: 2px !important;">
  <div class="d-flex align-items-center mb-3">
    <img src="/immagini/codacons-logo.png" alt="Codacons Logo" style="width: 80px; height: auto;" class="me-3">
    <h4 class="text-success mb-0 fw-bold">🌟 PARCO AUTO CERTIFICATO OK CODACONS 🌟</h4>
  </div>
  <ul class="list-unstyled mb-3">
    <li class="mb-2">✅ <strong>Garanzia Legale 12-24 mesi</strong> su tutti i veicoli usati</li>
    <li class="mb-2">✅ <strong>Controlli meccanici certificati</strong> Garanzia Mec</li>
    <li class="mb-2">✅ <strong>Tutela consumatori</strong> Codice del Consumo</li>
    <li class="mb-2">✅ <strong>Riparazioni gratuite</strong> difetti conformità</li>
    <li class="mb-2">✅ <strong>Certificato Conformità UE (COC)</strong> incluso</li>
    <li class="mb-2">✅ <strong>Sistema ConSenso</strong> per reclami rapidi</li>
  </ul>
  <p class="mt-3 mb-1 fs-5">👉 <strong>Azienda AFFIDABILE</strong> riconosciuta da Codacons</p>
  <p class="text-danger mb-0 fw-bold fs-5">🅾️ Solo auto selezionate e garantite al 100%</p>
</div>
<h3>Il nostro impegno per la qualità</h3>
<p>Da DP CARS, la qualità non è un'opzione, ma uno standard. Ogni veicolo nel nostro parco auto viene sottoposto a rigorosi controlli tecnici prima di essere messo in vendita, garantendo trasparenza e sicurezza totale per il cliente.</p>`;

    const result = await Dpcars1.findOneAndUpdate(
      { slug: 'qualita-garantita' },
      { contenuto: content },
      { upsert: true, new: true }
    );
    console.log('✅ Aggiornamento completato con successo per:', result.slug);
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore durante l\'aggiornamento:', err);
    process.exit(1);
  }
}
update();