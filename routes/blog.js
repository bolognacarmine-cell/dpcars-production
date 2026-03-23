// routes/blog.js
const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
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

// GET lista articoli (con filtro opzionale per argomento)
router.get('/', async (req, res) => {
  try {
    const { argomento } = req.query;
    const filter = argomento ? { argomento } : {};

    // Query ottimizzata: restituisce SOLO i campi necessari al frontend
    const blogs = await Blog.find(filter)
      .sort({ data: -1 })                  // dal più recente
      .limit(12)
      .lean()                              // molto più veloce (POJO invece di documenti Mongoose)
      .select('titolo argomento contenuto immagine data slug')  // campi che usa il frontend
      .exec();

    // Log di debug per vedere cosa restituiamo
    console.log('[BLOG] Richiesta arrivata - trovato:', blogs.length, 'articoli');
    if (blogs.length > 0) {
      console.log('[BLOG] Primo articolo:', JSON.stringify(blogs[0], null, 2));
    }

    res.json(blogs);
  } catch (err) {
    console.error('[BLOG ERROR] GET /api/blog:', err.message);
    res.status(500).json({
      error: 'Errore durante il recupero degli articoli',
      details: err.message
    });
  }
});

// GET singolo articolo per slug (utile per pagina dettaglio)
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .select('titolo argomento contenuto immagine data slug') // tutti i campi necessari
      .lean();

    if (!blog) {
      return res.status(404).json({ error: 'Articolo non trovato' });
    }

    res.json(blog);
  } catch (err) {
    console.error('[BLOG ERROR] GET /api/blog/:slug:', err.message);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST - creazione nuovo articolo (PROTETTA)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { titolo, argomento, contenuto, immagine, slug } = req.body;

    if (!titolo || !contenuto) {
      return res.status(400).json({ error: 'Titolo e contenuto obbligatori' });
    }

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