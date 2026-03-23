const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

// -------------------
// VALIDATION RULES
// -------------------
const blogValidationRules = [
  body('titolo').trim().notEmpty().withMessage('Titolo obbligatorio'),
  body('contenuto').trim().notEmpty().withMessage('Contenuto obbligatorio'),
  body('slug').optional({ checkFalsy: true }).trim().isSlug().withMessage('Slug non valido'),
  body('immagine').optional({ checkFalsy: true }).isURL().withMessage('URL immagine non valido'),
];

// GET lista articoli (con filtro opzionale per argomento)
router.get('/', async (req, res) => {
  try {
    const { cat } = req.query;
    let query = {};
    if (cat) query.argomento = cat;

    const articoli = await Blog.find(query).sort({ data: -1 });
    res.json(articoli);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero articoli' });
  }
});

// GET singolo articolo per slug
router.get('/:slug', async (req, res) => {
  try {
    const articolo = await Blog.findOne({ slug: req.params.slug });
    if (!articolo) return res.status(404).json({ error: 'Articolo non trovato' });
    res.json(articolo);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero articolo' });
  }
});

// POST - creazione nuovo articolo (PROTETTA)
router.post('/', authMiddleware, blogValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { titolo, argomento, contenuto, immagine, slug } = req.body;

    const nuovoBlog = new Blog({
      titolo,
      slug: slug || titolo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      argomento: argomento || 'Generale',
      contenuto,
      immagine: immagine || 'https://via.placeholder.com/800x450?text=Blog+DP+Cars',
      data: new Date()
    });

    await nuovoBlog.save();
    res.status(201).json(nuovoBlog);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slug già esistente' });
    }
    console.error('[BLOG ERROR] POST /api/blog:', err.message);
    res.status(500).json({ error: 'Errore creazione articolo' });
  }
});

// DELETE - eliminazione articolo (PROTETTA)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Articolo non trovato' });
    res.json({ success: true, message: 'Articolo eliminato' });
  } catch (err) {
    res.status(500).json({ error: 'Errore eliminazione articolo' });
  }
});

module.exports = router;