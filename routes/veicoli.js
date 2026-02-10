const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;

// Configurazione storage multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|avif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Solo immagini valide sono accettate"));
    }
  }
});

// GET /veicoli - restituisce lista veicoli
router.get("/", async (req, res) => {
  try {
    const veicoli = await Vehicle.find();
    res.json(veicoli);
  } catch (err) {
    console.error("Errore nel recupero veicoli:", err);
    res.status(500).json({ error: "Errore nel recupero veicoli" });
  }
});

// POST /veicoli - crea veicolo con upload immagini + statoVendita
router.post("/", upload.array("immagini", 10), async (req, res) => {
  try {
    console.log('📥 Dati ricevuti:', req.body); // DEBUG F1
    
    const data = req.body;
    const immaginiPaths = req.files?.map(file => "/uploads/" + file.filename) || [];

    // Parsing descrizioni da JSON string a array
    let descrizioniArr = [];
    if (data.descrizioni) {
      try {
        descrizioniArr = JSON.parse(data.descrizioni);
        if (!Array.isArray(descrizioniArr)) {
          descrizioniArr = [data.descrizioni];
        }
      } catch {
        descrizioniArr = [data.descrizioni];
      }
    }

    const newVehicle = new Vehicle({
      ...data,
      usato: data.usato === "true",
      chilometri: data.chilometri ? Number(data.chilometri) : undefined,
      meseImmatricolazione: data.meseImmatricolazione ? Number(data.meseImmatricolazione) : undefined,
      annoImmatricolazione: data.annoImmatricolazione ? Number(data.annoImmatricolazione) : undefined,
      cilindrata: data.cilindrata ? Number(data.cilindrata) : undefined,
      porte: data.porte ? Number(data.porte) : undefined,
      prezzo: data.prezzo ? Number(data.prezzo) : undefined,
      descrizioni: descrizioniArr,
      immagini: immaginiPaths,
      // NUOVO: statoVendita F1
      statoVendita: data.statoVendita || 'disponibile'
    });

    console.log('🚀 Salvataggio veicolo:', newVehicle.marca, newVehicle.statoVendita); // DEBUG
    
    const savedVehicle = await newVehicle.save();
    console.log('✅ Veicolo F1 salvato:', savedVehicle._id); // DEBUG
    
    res.status(201).json(savedVehicle);
  } catch (err) {
    console.error('💥 ERRORE POST /veicoli:', err.message); // DEBUG F1
    console.error('Stack:', err.stack); // DEBUG COMPLETO
    res.status(500).json({ error: "Errore creazione: " + err.message });
  }
});

// DELETE /veicoli/:id - elimina veicolo e immagini
router.delete("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Veicolo non trovato" });

    if (vehicle.immagini && vehicle.immagini.length > 0) {
      for (const imgPath of vehicle.immagini) {
        const filePath = path.join(__dirname, "../public", imgPath);
        try {
          await fsPromises.unlink(filePath);
        } catch (e) {
          console.warn(`Impossibile eliminare ${filePath}:`, e.message);
        }
      }
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: "Veicolo eliminato con successo 🏁" });
  } catch (err) {
    console.error('💥 ERRORE DELETE:', err);
    res.status(500).json({ error: "Errore eliminazione veicolo" });
  }
});

// Middleware gestione errori multer
router.use((err, req, res, next) => {
  console.error('🔴 MULTER ERROR:', err); // DEBUG
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File troppo grande. Max 5MB 🚫' });
    }
    return res.status(400).json({ error: 'Errore upload: ' + err.message });
  } else if (err) {
    return res.status(500).json({ error: 'Server F1 crash: ' + err.message });
  }
  next();
});

module.exports = router;
