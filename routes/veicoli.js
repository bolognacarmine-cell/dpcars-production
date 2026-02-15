const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const cloudinary = require("../cloudinary"); // usa la config corretta (da .env / config centralizzata)

// -------------------
// AUTH MIDDLEWARE BASIC (protegge solo le scritture)
// -------------------
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== "Basic ZHBjYXJzOmRwY2FyczIwMjY=") {
    return res.status(401).json({ error: "Accesso negato 🛑" });
  }
  next();
};

// -------------------
// MULTER IN MEMORIA
// -------------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|avif/;
    if (allowedTypes.test(file.mimetype)) cb(null, true);
    else cb(new Error("Solo immagini valide sono accettate"));
  },
});

// -------------------
// HELPER UPLOAD CLOUDINARY (OTTIMIZZATO)
// -------------------
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "veicoli",
        // OTTIMIZZAZIONI AUTOMATICHE DI CLOUDINARY
        width: 1600,           // max larghezza
        height: 1200,          // max altezza
        crop: "limit",         // non ingrandisce, solo ridimensiona se più grande
        quality: "auto",       // qualità ottimale
        format: "auto",        // WebP/AVIF se supportato dal browser
        fetch_format: "auto",
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(fileBuffer);
  });
};

// -------------------
// GET /veicoli (PUBBLICO)
// -------------------
router.get("/", async (req, res) => {
  try {
    const veicoli = await Vehicle.find();
    res.json(veicoli);
  } catch (err) {
    console.error("💥 ERRORE GET /veicoli:", err);
    res.status(500).json({ error: "Errore nel recupero veicoli" });
  }
});

// -------------------
// GET /veicoli/:id (PUBBLICO)
// -------------------
router.get("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Veicolo non trovato" });
    res.json(vehicle);
  } catch (err) {
    console.error("💥 ERRORE GET /veicoli/:id:", err);
    res.status(500).json({ error: "Errore nel recupero veicolo" });
  }
});

// -------------------
// POST /veicoli (PROTETTO)
// -------------------
router.post("/", authMiddleware, upload.array("immagini", 10), async (req, res) => {
  try {
    const data = req.body;

    const uploadedResults = await Promise.all(
      (req.files || []).map((file) => uploadToCloudinary(file.buffer))
    );

    const immaginiArr = uploadedResults.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
    }));

    // Parsing descrizioni
    let descrizioniArr = [];
    if (data.descrizioni) {
      try {
        descrizioniArr = JSON.parse(data.descrizioni);
      } catch {
        descrizioniArr = [data.descrizioni];
      }
      if (!Array.isArray(descrizioniArr)) descrizioniArr = [data.descrizioni];
    }

    const newVehicle = new Vehicle({
      ...data,
      usato: data.usato === "true",
      chilometri: data.chilometri ? Number(data.chilometri) : undefined,
      meseImmatricolazione: data.meseImmatricolazione
        ? Number(data.meseImmatricolazione)
        : undefined,
      annoImmatricolazione: data.annoImmatricolazione
        ? Number(data.annoImmatricolazione)
        : undefined,
      cilindrata: data.cilindrata ? Number(data.cilindrata) : undefined,
      porte: data.porte ? Number(data.porte) : undefined,
      prezzo: data.prezzo ? Number(data.prezzo) : undefined,
      descrizioni: descrizioniArr,
      immagini: immaginiArr,
      statoVendita: data.statoVendita || "disponibile",
    });

    const savedVehicle = await newVehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    console.error("💥 ERRORE POST /veicoli:", err);
    res.status(500).json({ error: "Errore creazione veicolo: " + err.message });
  }
});

// -------------------
// PUT /veicoli/:id (PROTETTO)
// -------------------
router.put("/:id", authMiddleware, upload.array("immagini", 10), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Veicolo non trovato" });

    const data = req.body;

    // Rimuovi immagini se specificato (array di public_id da eliminare)
    if (data.rimuoviImmagini) {
      const daRimuovere = Array.isArray(data.rimuoviImmagini)
        ? data.rimuoviImmagini
        : [data.rimuoviImmagini];

      for (const public_id of daRimuovere) {
        try {
          await cloudinary.uploader.destroy(public_id);
          vehicle.immagini = vehicle.immagini.filter((img) => img.public_id !== public_id);
        } catch (err) {
          console.warn(`⚠️ Non è stato possibile eliminare ${public_id}:`, err.message);
        }
      }
    }

    // Upload nuove immagini se presenti
    if (req.files?.length) {
      const uploadedResults = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );
      vehicle.immagini.push(
        ...uploadedResults.map((r) => ({ url: r.secure_url, public_id: r.public_id }))
      );
    }

    // Aggiorna campi
    vehicle.marca = data.marca || vehicle.marca;
    vehicle.modello = data.modello || vehicle.modello;
    vehicle.usato = data.usato !== undefined ? data.usato === "true" : vehicle.usato;
    vehicle.chilometri = data.chilometri ? Number(data.chilometri) : vehicle.chilometri;
    vehicle.meseImmatricolazione = data.meseImmatricolazione
      ? Number(data.meseImmatricolazione)
      : vehicle.meseImmatricolazione;
    vehicle.annoImmatricolazione = data.annoImmatricolazione
      ? Number(data.annoImmatricolazione)
      : vehicle.annoImmatricolazione;
    vehicle.cilindrata = data.cilindrata ? Number(data.cilindrata) : vehicle.cilindrata;
    vehicle.porte = data.porte ? Number(data.porte) : vehicle.porte;
    vehicle.prezzo = data.prezzo ? Number(data.prezzo) : vehicle.prezzo;

    if (data.descrizioni) {
      try {
        let descrizioniArr = JSON.parse(data.descrizioni);
        if (!Array.isArray(descrizioniArr)) descrizioniArr = [descrizioniArr];
        vehicle.descrizioni = descrizioniArr;
      } catch {
        vehicle.descrizioni = [data.descrizioni];
      }
    }

    if (data.statoVendita) vehicle.statoVendita = data.statoVendita;

    const updatedVehicle = await vehicle.save();
    res.json(updatedVehicle);
  } catch (err) {
    console.error("💥 ERRORE PUT /veicoli/:id:", err);
    res.status(500).json({ error: "Errore aggiornamento veicolo: " + err.message });
  }
});

// -------------------
// DELETE /veicoli/:id (PROTETTO)
// -------------------
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Veicolo non trovato" });

    if (vehicle.immagini?.length) {
      await Promise.allSettled(
        vehicle.immagini.map((img) =>
          img.public_id ? cloudinary.uploader.destroy(img.public_id) : null
        )
      );
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: "Veicolo e immagini eliminati con successo 🏁" });
  } catch (err) {
    console.error("💥 ERRORE DELETE /veicoli/:id:", err);
    res.status(500).json({ error: "Errore eliminazione veicolo" });
  }
});

// -------------------
// MIDDLEWARE ERRORI MULTER
// -------------------
router.use((err, req, res, next) => {
  console.error("🔴 MULTER ERROR:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File troppo grande. Max 5MB 🚫" });
    }
    return res.status(400).json({ error: "Errore upload: " + err.message });
  } else if (err) {
    return res.status(500).json({ error: "Server crash: " + err.message });
  }

  next();
});

module.exports = router;
