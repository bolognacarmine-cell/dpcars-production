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
    maxlength: 160  // breve, per la card
  },
  contenuto: {
    type: String,
    required: true  // testo completo, può contenere HTML
  },
  icona: {          // opzionale: nome icona Bootstrap Icons / Font Awesome
    type: String,
    default: 'shield-check'
  },
  ordine: {
    type: Number,
    default: 999,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true  // aggiunge updatedAt automaticamente
});

module.exports = mongoose.model('Dpcars', dpcarsSchema);
