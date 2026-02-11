const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true }
});

const vehicleSchema = new mongoose.Schema({
  tipo: { type: String, enum: ["auto", "moto"], required: true },
  marca: { type: String, required: true },
  modello: { type: String, required: true },

  meseImmatricolazione: { type: Number, min: 1, max: 12 },
  annoImmatricolazione: { type: Number, min: 1900, max: 2100 },

  categoriaEuro: String,

  usato: { type: Boolean, default: false },

  chilometri: Number,

  carburante: {
    type: String,
    enum: ["benzina", "diesel", "gpl", "elettrico", "ibrido"],
  },

  cambio: {
    type: String,
    enum: ["manuale", "automatico", "semiautomatico"],
  },

  colore: String,
  cilindrata: Number,
  porte: Number,

  prezzo: { type: Number, required: true },

  tipoAuto: {
    type: String,
    enum: [
      "suv",
      "utilitaria",
      "berlina",
      "station wagon",
      "coupè",
      "van",
      "monovolume",
      "cabriolet",
    ],
  },

  // 🆕 F1 STATO VENDITA
  statoVendita: {
    type: String,
    enum: ['disponibile', 'trattativa', 'venduto'],
    default: 'disponibile'
  },

  descrizioni: [String], // accessori / descrizioni veicolo

  immagini: { type: [ImageSchema], default: [] }, // array di oggetti {url, public_id}

}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
