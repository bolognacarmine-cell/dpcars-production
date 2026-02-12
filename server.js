console.log("SERVER FILE:", __filename);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
app.use(cors({
  origin: "*", // poi lo rendiamo sicuro
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "public")));

// Cloudinary init
require("./cloudinary");

// -------------------
// AUTH MIDDLEWARE BASIC
// -------------------
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== "Basic ZHBjYXJzOmRwY2FyczIwMjY=") {
    return res.status(401).json({ error: "Accesso negato 🛑" });
  }
  next();
};

// Routes
app.use("/veicoli", require("./routes/veicoli"));


app.get("/api/test", (req, res) => {
  res.json({ message: "DP Cars Backend + Cloudinary 🏁" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Non trovato" });
});

// -------------------
// START: connect DB then listen
// -------------------
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI mancante nel .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connesso");

    app.listen(PORT, () => {
      console.log(`🚀 DP Cars Backend su http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Errore connessione MongoDB:", err.message);
    process.exit(1);
  }
}

start();
