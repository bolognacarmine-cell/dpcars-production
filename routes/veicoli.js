const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const cloudinary = require("../cloudinary");

// -------------------
// AUTH MIDDLEWARE (SICURO)
// -------------------
const authMiddleware = (req, res, next) => {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Auth non configurata" });
  }

  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    return res.status(401).json({ error: "Accesso negato 🛑" });
  }

  try {
    const credentials = Buffer.from(auth.split(" ")[1], "base64").toString();
    const [user, pass] = credentials.split(":");

    if (
      user !== process.env.ADMIN_USER ||
      pass !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ error: "Accesso negato 🛑" });
    }

    next();
  } catch {
    return res.status(401).json({ error: "Accesso negato 🛑" });
  }
};

// -------------------
// MULTER CONFIG
// -------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|avif|webp/;
    if (allowedTypes.test(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Solo immagini valide sono accettate"));
    }
  },
});

// -------------------
// CLOUDINARY UPLOAD HELPER
// -------------------
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "veicoli",
        width: 1600,
        height: 1200,
        crop: "limit",
        quality: "auto",
        fetch_format: "auto",
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

// -------------------
// GET ALL VEICOLI (PUBBLICO)
// -------------------
router.get("/", async (req, res) => {
  try {
    const veicoli = await Vehicle.find().sort({ createdAt: -1 });
    res.json(veicoli);
  } catch (err) {
    console.error("💥 ERRORE GET /veicoli:", err);
    res.status(500).json({ error: "Errore nel recupero veicoli" });
  }
});

// -------------------
// GET VEICOLO BY ID (PUBBLICO)
// -------------------
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Veicolo non trovato" });
    }

    res.json(vehicle);
  } catch (err) {
    console.error("💥 ERRORE GET /veicoli/:id:", err);
    res.status(500).json({ error: "Errore nel recupero veicolo" });
  }
});

// -------------------
// CREATE VEICOLO (PROTETTO)
// -------------------
router.post(
  "/",
  authMiddleware,
  upload.array("immagini", 10),
  async (req, res) => {
    try {
      if (req.files && req.files.length > 10) {
        return res.status(400).json({ error: "Max 10 immagini consentite" });
      }

      const data = req.body;

      const uploadedResults = await Promise.all(
        (req.files || []).map((file) =>
          uploadToCloudinary(file.buffer)
        )
      );

      const immaginiArr = uploadedResults.map((r) => ({
        url: r.secure_url,
        public_id: r.public_id,
      }));

      let descrizioniArr = [];

      if (data.descrizioni) {
        try {
          descrizioniArr = JSON.parse(data.descrizioni);
        } catch {
          descrizioniArr = [data.descrizioni];
        }

        if (!Array.isArray(descrizioniArr)) {
          descrizioniArr = [data.descrizioni];
        }
      }

      const newVehicle = new Vehicle({
  tipo: data.tipo || "auto",
  marca: data.marca,
  modello: data.modello,
  usato: data.usato === "true",
  chilometri: data.chilometri ? Number(data.chilometri) : undefined,
  meseImmatricolazione: data.meseImmatricolazione ? Number(data.meseImmatricolazione) : undefined,
  annoImmatricolazione: data.annoImmatricolazione ? Number(data.annoImmatricolazione) : undefined,
  categoriaEuro: data.categoriaEuro || undefined,  // ✅ ESPLICITO!
  tipoAuto: data.tipoAuto || undefined,            // ✅ ESPLICITO!
  cilindrata: data.cilindrata ? Number(data.cilindrata) : undefined,
  carburante: data.carburante || undefined,
  cambio: data.cambio || undefined,
  porte: data.porte ? Number(data.porte) : undefined,
  colore: data.colore || undefined,
  prezzo: data.prezzo ? Number(data.prezzo) : undefined,
  descrizioni: descrizioniArr,
  immagini: immaginiArr,
  statoVendita: data.statoVendita || "disponibile",
});

      const savedVehicle = await newVehicle.save();

      res.status(201).json(savedVehicle);
    } catch (err) {
      console.error("💥 ERRORE POST /veicoli:", err);
      res.status(500).json({
        error: "Errore creazione veicolo: " + err.message,
      });
    }
  }
);

// -------------------
// UPDATE VEICOLO (PROTETTO)
// -------------------
router.put(
  "/:id",
  authMiddleware,
  upload.array("immagini", 10),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "ID non valido" });
      }

      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({ error: "Veicolo non trovato" });
      }

      const data = req.body;

      // ✅ AGGIUNGI TUTTI I CAMPI MANCANTI!
      vehicle.marca = data.marca || vehicle.marca;
      vehicle.modello = data.modello || vehicle.modello;
      vehicle.categoriaEuro = data.categoriaEuro || vehicle.categoriaEuro;
      vehicle.tipoAuto = data.tipoAuto || vehicle.tipoAuto;
      vehicle.carburante = data.carburante || vehicle.carburante;
      vehicle.colore = data.colore || vehicle.colore;
      vehicle.cambio = data.cambio || vehicle.cambio;
      vehicle.statoVendita = data.statoVendita || vehicle.statoVendita;

      if (data.usato !== undefined) {
        vehicle.usato = data.usato === "true";
      }

      if (data.chilometri) vehicle.chilometri = Number(data.chilometri);
      if (data.meseImmatricolazione) vehicle.meseImmatricolazione = Number(data.meseImmatricolazione);
      if (data.annoImmatricolazione) vehicle.annoImmatricolazione = Number(data.annoImmatricolazione);
      if (data.cilindrata) vehicle.cilindrata = Number(data.cilindrata);
      if (data.porte) vehicle.porte = Number(data.porte);
      if (data.prezzo) vehicle.prezzo = Number(data.prezzo);

      if (data.descrizioni) {
        try {
          let descrizioniArr = JSON.parse(data.descrizioni);
          if (!Array.isArray(descrizioniArr)) descrizioniArr = [descrizioniArr];
          vehicle.descrizioni = descrizioniArr;
        } catch {
          vehicle.descrizioni = [data.descrizioni];
        }
      }

      // Immagini (codice tuo esistente)
      if (data.rimuoviImmagini) {
        const daRimuovere = Array.isArray(data.rimuoviImmagini) ? data.rimuoviImmagini : [data.rimuoviImmagini];
        for (const public_id of daRimuovere) {
          try {
            await cloudinary.uploader.destroy(public_id);
            vehicle.immagini = vehicle.immagini.filter(img => img.public_id !== public_id);
          } catch (err) {
            console.warn(`⚠️ Errore eliminazione immagine ${public_id}`, err.message);
          }
        }
      }

      if (req.files?.length) {
        const uploadedResults = await Promise.all(req.files.map(file => uploadToCloudinary(file.buffer)));
        vehicle.immagini.push(...uploadedResults.map(r => ({
          url: r.secure_url,
          public_id: r.public_id
        })));
      }

      const updatedVehicle = await vehicle.save();
      res.json(updatedVehicle);
    } catch (err) {
      console.error("💥 ERRORE PUT /veicoli:", err);
      res.status(500).json({ error: "Errore aggiornamento veicolo: " + err.message });
    }
  }
);

// -------------------
// DELETE VEICOLO (PROTETTO)
// -------------------
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Veicolo non trovato" });
    }

    if (vehicle.immagini?.length) {
      await Promise.allSettled(
        vehicle.immagini.map((img) =>
          cloudinary.uploader.destroy(img.public_id)
        )
      );
    }

    await Vehicle.findByIdAndDelete(req.params.id);

    res.json({
      message: "Veicolo eliminato con successo 🏁",
    });
  } catch (err) {
    console.error("💥 ERRORE DELETE /veicoli:", err);
    res.status(500).json({
      error: "Errore eliminazione veicolo",
    });
  }
});

// -------------------
// ERROR HANDLER MULTER
// -------------------
router.use((err, req, res, next) => {
  console.error("🔴 ERRORE MULTER:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File troppo grande. Max 5MB 🚫",
      });
    }

    return res.status(400).json({
      error: err.message,
    });
  }

  if (err) {
    return res.status(500).json({
      error: err.message,
    });
  }

  next();
});

module.exports = router;
