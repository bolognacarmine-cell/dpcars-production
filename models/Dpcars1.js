const mongoose = require('mongoose');

const dpcarsSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  titolo: {
    type: String,
    required: true,
    trim: true
  },
  anteprima: {
    type: String,
    required: true,
    maxlength: 160  // limite ragionevole per la card
  },
  contenuto: {
    type: String,
    required: true  // testo completo, può contenere HTML
  },
  icona: {
    type: String,
    default: 'shield-check'  // default sensato per Bootstrap Icons
  },
  ordine: {
    type: Number,
    default: 999,
    min: 1
  }
}, {
  timestamps: true  // aggiunge automaticamente createdAt e updatedAt
});

// Rinominiamo il modello in 'Dpcars1' per coerenza con il file routes/dpcars1.js
module.exports = mongoose.model('Dpcars1', dpcarsSchema);