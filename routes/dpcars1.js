// routes/dpcars1.js
const express = require('express');
const router = express.Router();
const Dpcars1 = require('../models/Dpcars1');  // importa il modello che hai appena creato
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "dpcars-secret-key-2026";

// -------------------
// AUTH MIDDLEWARE (JWT)
// -------------------
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Accesso negato. Token mancante." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token non valido o scaduto." });
  }
};

// GET - Recupera tutte le card (solo campi necessari per la visualizzazione in homepage)
router.get('/', async (req, res) => {
  try {
    const vantaggi = await Dpcars1.find()
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
    const vantaggio = await Dpcars1.findOne({ slug: req.params.slug }).lean();

    if (!vantaggio) {
      return res.status(404).json({ success: false, message: 'Vantaggio non trovato' });
    }

    res.json(vantaggio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore nel server' });
  }
});

// POST - creazione vantaggio (PROTETTA)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const nuovo = new Dpcars1(req.body);
    await nuovo.save();
    res.status(201).json(nuovo);
  } catch (err) {
    res.status(500).json({ error: 'Errore creazione vantaggio' });
  }
});

// PUT - modifica vantaggio (PROTETTA)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const aggiornato = await Dpcars1.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(aggiornato);
  } catch (err) {
    res.status(500).json({ error: 'Errore modifica vantaggio' });
  }
});

// DELETE - eliminazione vantaggio (PROTETTA)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Dpcars1.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore eliminazione vantaggio' });
  }
});

module.exports = router;