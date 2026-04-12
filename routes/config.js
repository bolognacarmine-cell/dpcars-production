const express = require("express");
const router = express.Router();
const Config = require("../models/Config");
const authMiddleware = require("../middleware/auth");

// Get a specific config by key
router.get("/:key", async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    if (!config) return res.status(404).json({ error: "Configurazione non trovata" });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero della configurazione" });
  }
});

// Update or create a config (Protected)
router.post("/", authMiddleware, async (req, res) => {
  const { key, value } = req.body;
  try {
    const config = await Config.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: "Errore nell'aggiornamento della configurazione" });
  }
});

module.exports = router;
