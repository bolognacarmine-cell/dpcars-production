// routes/dpcars.js
const express = require('express');
const router = express.Router();
const Dpcars = require('../models/Dpcars');  // importa il modello che hai appena creato

// GET - Recupera tutte le card (solo campi necessari per la visualizzazione in homepage)
router.get('/', async (req, res) => {
  try {
    const vantaggi = await Dpcars.find()
      .select('slug titolo anteprima icona ordine')   // campi leggeri, no contenuto lungo
      .sort({ ordine: 1 })                             // ordine che hai definito
      .lean();                                         // più veloce, restituisce plain objects

    res.json(vantaggi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore nel recupero dei vantaggi' });
  }
});

// GET - Singolo vantaggio/articolo per slug (per la pagina di dettaglio)
router.get('/:slug', async (req, res) => {
  try {
    const vantaggio = await Dpcars.findOne({ slug: req.params.slug }).lean();

    if (!vantaggio) {
      return res.status(404).json({ success: false, message: 'Vantaggio non trovato' });
    }

    res.json(vantaggio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore nel server' });
  }
});

// Opzionale: se vuoi permettere l'aggiunta/modifica da admin in futuro
// router.post('/', ...) 
// router.put('/:slug', ...) 
// router.delete('/:slug', ...)

module.exports = router;