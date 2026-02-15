console.log("SERVER FILE:", __filename);

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");  
const rateLimit = require("express-rate-limit");

const app = express();
app.set('trust proxy', 1);  // Fidati di 1 proxy (Render ne usa uno)
app.disable("x-powered-by"); 
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minuti
  max: 100                     // max 100 richieste per IP
});

app.use("/veicoli", limiter);
app.use("/api", limiter);
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
// PROTEZIONE admin.html
app.get("/admin.html", (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", "Basic realm=\"Admin Panel\"");
    return res.status(401).send("Autenticazione richiesta");
  }

  const credentials = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = credentials.split(":");

  if (
    user !== process.env.ADMIN_USER ||
    pass !== process.env.ADMIN_PASSWORD
  ) {
    res.setHeader("WWW-Authenticate", "Basic realm=\"Admin Panel\"");
    return res.status(401).send("Credenziali non valide");
  }

  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

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
