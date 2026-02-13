console.log("SERVER FILE:", __filename);

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.disable("x-powered-by"); 
app.use(helmet());             // 👈 sicurezza header

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minuti
  max: 100                     // max 100 richieste per IP
});

app.use(limiter);              // 👈 protezione anti spamy
const PORT = process.env.PORT || 3000;

// -------------------
// MIDDLEWARE
// -------------------

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// -------------------
// CLOUDINARY
// -------------------
require("./cloudinary");

// -------------------
// ROUTES
// -------------------

app.use("/veicoli", require("./routes/veicoli"));

app.get("/api/test", (req, res) => {
  res.json({ message: "DP Cars Backend + Cloudinary 🏁" });
});

// -------------------
// SPA FALLBACK (IMPORTANTISSIMO)
// -------------------

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// -------------------
// START SERVER
// -------------------

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI mancante su Render");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connesso");

    app.listen(PORT, () => {
      console.log(`🚀 Server attivo su porta ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Errore MongoDB:", err.message);
    process.exit(1);
  }
}

start();
