const express = require('express');
const router = express.Router();
const Dpcars1 = require('../models/Dpcars1');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

// -------------------
// VALIDATION RULES
// -------------------
const cardValidationRules = [
  body('titolo').trim().notEmpty().withMessage('Titolo obbligatorio'),
  body('testo').trim().notEmpty().withMessage('Testo obbligatorio'),
  body('slug').trim().notEmpty().withMessage('Slug obbligatorio'),
];

// GET - Recupera tutte le card
router.get('/', async (req, res) => {
  try {
    const cards = await Dpcars1.find({}, 'titolo testo icona slug immagine order').sort({ order: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero card' });
  }
});

// GET - Singolo vantaggio per slug
router.get('/:slug', async (req, res) => {
  try {
    const vantaggio = await Dpcars1.findOne({ slug: req.params.slug }).lean();
    if (!vantaggio) return res.status(404).json({ error: 'Vantaggio non trovato' });
    res.json(vantaggio);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel server' });
  }
});

// POST - creazione vantaggio (PROTETTA)
router.post('/', authMiddleware, cardValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const nuovo = new Dpcars1(req.body);
    await nuovo.save();
    res.status(201).json(nuovo);
  } catch (err) {
    res.status(500).json({ error: 'Errore creazione vantaggio' });
  }
});

// PUT - modifica vantaggio (PROTETTA)
router.put('/:id', authMiddleware, cardValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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