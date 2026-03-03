const mongoose = require('mongoose');

const dpcarsSchema = new mongoose.Schema({
  argomento: { type: String, required: true },
  titolo: String,
  testo: String,
  // campi automotive extra
  prezzo: Number,
  immagine: String
});

module.exports = mongoose.model('Dpcars', dpcarsSchema);
