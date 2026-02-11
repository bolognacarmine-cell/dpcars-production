const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // upload in memoria
const cloudinary = require('../cloudinary'); // importa la config corretta
const Veicolo = require('../models/veicolo');

// Route per aggiungere un veicolo con immagini
router.post('/', upload.array('immagini', 10), async (req, res) => {
  try {
    const uploadedUrls = [];

    // Funzione per upload su Cloudinary
    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'veicoli' }, // cartella su Cloudinary
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(fileBuffer);
      });
    };

    // Carica tutte le immagini
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer);
      uploadedUrls.push({ url: result.secure_url, public_id: result.public_id });
    }

    // Crea e salva il veicolo
    const veicoloData = { ...req.body, immagini: uploadedUrls };
    const veicolo = new Veicolo(veicoloData);
    await veicolo.save();

    res.status(201).json(veicolo);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore durante l'upload delle immagini" });
  }
});

module.exports = router;
