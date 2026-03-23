const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../cloudinary');
const Permuta = require('../models/Permuta');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "dpcars-secret-key-2026";

// Configurazione Multer per storage temporaneo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/temp';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

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

// Rotta per inviare la richiesta di permuta (PUBBLICA)
router.post('/', upload.array('immagini', 10), async (req, res) => {
  try {
    const data = req.body;
    const images = [];

    // Caricamento immagini su Cloudinary se presenti
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'permute'
        });
        images.push({
          url: result.secure_url,
          public_id: result.public_id
        });
        // Elimina file temporaneo
        fs.unlinkSync(file.path);
      }
    }

    // Creazione record nel database
    const nuovaPermuta = new Permuta({
      nome_cognome: data.nome_cognome,
      email: data.email,
      telefono: data.telefono,
      citta: data.citta,
      marca: data.marca,
      modello: data.modello,
      versione: data.versione,
      anno: parseInt(data.anno),
      mese: data.mese ? parseInt(data.mese) : undefined,
      km: parseInt(data.km),
      alimentazione: data.alimentazione,
      cambio: data.cambio,
      cilindrata: data.cilindrata ? parseInt(data.cilindrata) : undefined,
      potenza: data.potenza,
      colore: data.colore,
      proprietari: data.proprietari ? parseInt(data.proprietari) : undefined,
      targa: data.targa,
      condizioni: data.condizioni,
      incidentata: data.incidentata === 'si',
      tagliandata: data.tagliandata === 'si',
      revisione: data.revisione === 'si',
      danni_esterni: data.danni_esterni === 'si',
      danni_interni: data.danni_interni === 'si',
      fumatori: data.fumatori === 'si',
      gomme_ok: data.gomme_ok === 'si',
      descrizione: data.descrizione,
      auto_interesse: data.auto_interesse,
      immagini: images,
      privacy: data.privacy === 'on' || data.privacy === 'true' || data.privacy === true,
      marketing: data.marketing === 'on' || data.marketing === 'true' || data.marketing === true
    });

    await nuovaPermuta.save();

    res.status(201).json({
      success: true,
      message: 'Richiesta di permuta inviata con successo.'
    });

  } catch (error) {
    console.error('Errore invio permuta:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'invio della richiesta.'
    });
  }
});

// Rotta per ottenere tutte le richieste (per Admin - PROTETTA)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const permute = await Permuta.find().sort({ createdAt: -1 });
    res.json(permute);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero delle richieste.' });
  }
});

// Rotta per aggiornare lo stato di una richiesta (PROTETTA)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { stato } = req.body;
    const permuta = await Permuta.findByIdAndUpdate(req.params.id, { stato }, { new: true });
    res.json(permuta);
  } catch (error) {
    res.status(500).json({ error: 'Errore nell\'aggiornamento dello stato.' });
  }
});

// Rotta per eliminare una richiesta (PROTETTA)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const permuta = await Permuta.findById(req.params.id);
    if (permuta && permuta.immagini.length > 0) {
      // Elimina immagini da Cloudinary
      for (const img of permuta.immagini) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }
    await Permuta.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Errore nell\'eliminazione della richiesta.' });
  }
});

module.exports = router;
