const mongoose = require('mongoose');

const permutaSchema = new mongoose.Schema({
  nome_cognome: { type: String, required: true },
  email: { type: String, required: true },
  telefono: { type: String, required: true },
  citta: { type: String, required: true },
  
  // Dati Veicolo
  marca: { type: String, required: true },
  modello: { type: String, required: true },
  versione: String,
  anno: { type: Number, required: true },
  mese: Number,
  km: { type: Number, required: true },
  alimentazione: { type: String, required: true },
  cambio: { type: String, required: true },
  cilindrata: Number,
  potenza: String,
  colore: String,
  proprietari: Number,
  targa: String,
  
  // Stato Veicolo
  condizioni: { type: String, required: true },
  incidentata: { type: Boolean, default: false },
  tagliandata: { type: Boolean, default: false },
  revisione: { type: Boolean, default: false },
  danni_esterni: { type: Boolean, default: false },
  danni_interni: { type: Boolean, default: false },
  fumatori: { type: Boolean, default: false },
  gomme_ok: { type: Boolean, default: false },
  
  // Note e Foto
  descrizione: String,
  auto_interesse: String,
  immagini: [{
    url: String,
    public_id: String
  }],
  
  // Privacy
  privacy: { type: Boolean, required: true },
  marketing: { type: Boolean, default: false },
  
  stato: {
    type: String,
    enum: ['nuova', 'in_gestione', 'completata', 'rifiutata'],
    default: 'nuova'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Permuta', permutaSchema);
