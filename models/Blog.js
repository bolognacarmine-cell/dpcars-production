const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  titolo: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  argomento: { type: String },
  contenuto: { type: String, required: true },
  immagine: { type: String },
  data: { type: Date, default: Date.now },
  // aggiungi altri campi se vuoi
});

module.exports = mongoose.model('Blog', blogSchema);