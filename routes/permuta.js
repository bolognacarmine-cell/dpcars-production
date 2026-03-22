const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configurazione Multer per l'upload delle immagini
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Assicurati che la cartella 'uploads' esista
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Rotta per gestire la richiesta di permuta
router.post('/', upload.array('immagini', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files;

    console.log('--- NUOVA RICHIESTA DI PERMUTA ---');
    console.log('Dati Personali:', {
      nome: data.nome_cognome,
      email: data.email,
      telefono: data.telefono,
      citta: data.citta
    });
    console.log('Dati Veicolo:', {
      marca: data.marca,
      modello: data.modello,
      anno: data.anno,
      km: data.km,
      alimentazione: data.alimentazione
    });
    console.log('Immagini caricate:', files ? files.length : 0);
    console.log('---------------------------------');

    // Qui andrebbe la logica per inviare un'email (es. con nodemailer)
    // o salvare la richiesta nel database.

    res.status(200).json({
      success: true,
      message: 'Richiesta di permuta ricevuta con successo.'
    });

  } catch (error) {
    console.error('Errore gestione permuta:', error);
    res.status(500).json({
      success: false,
      message: 'Si è verificato un errore nel server.'
    });
  }
});

module.exports = router;
