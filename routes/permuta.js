const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../cloudinary');
const Permuta = require('../models/Permuta');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

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
// VALIDATION RULES
// -------------------
const permutaValidationRules = [
  body('nome_cognome').trim().notEmpty().withMessage('Nome e cognome obbligatori'),
  body('email').isEmail().withMessage('Email non valida'),
  body('telefono').trim().notEmpty().withMessage('Telefono obbligatorio'),
  body('marca').trim().notEmpty().withMessage('Marca veicolo obbligatoria'),
  body('modello').trim().notEmpty().withMessage('Modello veicolo obbligatorio'),
  body('anno').isInt({ min: 1900, max: 2100 }).withMessage('Anno non valido'),
  body('km').isInt({ min: 0 }).withMessage('Km non validi'),
];

// Rotta per inviare la richiesta di permuta (PUBBLICA)
router.post('/', upload.array('immagini', 10), permutaValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Rimuovi file caricati se ci sono errori di validazione
    if (req.files) {
      req.files.forEach(file => fs.unlinkSync(file.path));
    }
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const data = req.body;
    
    // Upload immagini su Cloudinary
    const immaginiCloudinary = [];
    if (req.files) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'permute',
        });
        immaginiCloudinary.push({
          url: result.secure_url,
          public_id: result.public_id
        });
        // Elimina file temporaneo
        fs.unlinkSync(file.path);
      }
    }

    const nuovaPermuta = new Permuta({
      ...data,
      immagini: immaginiCloudinary,
      km: Number(data.km),
      anno: Number(data.anno),
      incidentata: data.incidentata === 'true',
      tagliandata: data.tagliandata === 'true',
      revisione: data.revisione === 'true',
      fumatori: data.fumatori === 'true',
    });

    await nuovaPermuta.save();
    res.status(201).json({ success: true, message: 'Richiesta inviata con successo!' });
  } catch (error) {
    console.error('Errore permuta:', error);
    res.status(500).json({ error: 'Errore durante l\'invio della richiesta.' });
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
router.patch('/:id', authMiddleware, [
  body('stato').isIn(['nuova', 'in_gestione', 'completata', 'rifiutata']).withMessage('Stato non valido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
    if (!permuta) return res.status(404).json({ error: 'Richiesta non trovata' });

    // Elimina immagini da Cloudinary
    for (const img of permuta.immagini) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    await Permuta.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Richiesta eliminata.' });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'eliminazione.' });
  }
});

module.exports = router;