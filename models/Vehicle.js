const mongoose = require("mongoose");

// -------------------
// IMAGE SCHEMA
// -------------------
const ImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    public_id: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false, // evita id inutili per ogni immagine
  }
);

// -------------------
// VEHICLE SCHEMA
// -------------------
const VehicleSchema = new mongoose.Schema(
  {
    marca: {
      type: String,
      required: true,
      trim: true,
    },

    modello: {
      type: String,
      required: true,
      trim: true,
    },

    versione: {
      type: String,
      trim: true,
    },

    prezzo: {
      type: Number,
      required: true,
      min: 0,
    },

    usato: {
      type: Boolean,
      default: false,
    },

    chilometri: {
      type: Number,
      min: 0,
    },

    meseImmatricolazione: {
      type: Number,
      min: 1,
      max: 12,
    },

    annoImmatricolazione: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    categoriaEuro: {
    type: String,
    trim: true,
    },
    
    tipoAuto: {
    type: String,
    trim: true,
   },
   
    cilindrata: {
      type: Number,
      min: 0,
    },

    carburante: {
      type: String,
      trim: true,
    },

    cambio: {
      type: String,
      trim: true,
    },

    porte: {
      type: Number,
      min: 0,
    },

    colore: {
      type: String,
      trim: true,
    },

    descrizioni: {
      type: [String],
      default: [],
    },

    immagini: {
      type: [ImageSchema],
      default: [],
    },

    statoVendita: {
      type: String,
      enum: ["disponibile", "venduto", "in trattativa"],
      default: "disponibile",
    },
  },
  {
    timestamps: true, // aggiunge createdAt e updatedAt
  }
);

// -------------------
// INDEX per performance
// -------------------
VehicleSchema.index({ createdAt: -1 });
VehicleSchema.index({ statoVendita: 1 });
VehicleSchema.index({ marca: 1, modello: 1 });

// -------------------
// EXPORT
// -------------------
module.exports = mongoose.model("Vehicle", VehicleSchema);
