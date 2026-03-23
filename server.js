console.log("SERVER FILE:", __filename);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const http = require("http");
const { WebSocketServer } = require("ws");

const crypto = require("crypto");

const app = express();

app.use(cookieParser());

// Middleware per generare nonce per ogni richiesta
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "dpcars-secret-key-2026";

app.set("trust proxy", 1);
app.disable("x-powered-by");

const authMiddleware = require("./middleware/auth");

// ==========================
// REDIRECT TO CUSTOM DOMAIN (SEO 301)
// ==========================
app.use((req, res, next) => {
  const host = req.get('host');
  // Se l'host è quello di Render o il dominio senza www, reindirizza a www.dpcars.it
  if (host === 'dpcars-production.onrender.com' || host === 'dpcars.it') {
    return res.redirect(301, `https://www.dpcars.it${req.originalUrl}`);
  }
  next();
});

// ==========================
// SECURITY
// ==========================

// CSP Base per tutto il sito (permette script inline per le pagine statiche)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Necessario per le pagine statiche attuali
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://js-eu1.hs-scripts.com",
          "https://js.hs-scripts.com",
          "https://js.hscollectedforms.net",
          "https://js-eu1.hs-analytics.net",
          "https://embed.tawk.to",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://images.unsplash.com",
          "https://www.google.com",
          "https://www.google.it",
          "https://maps.gstatic.com",
          "https://maps.googleapis.com",
          "https://*.hs-scripts.com",
          "https://forms.hubspot.com",
        ],
        connectSrc: [
          "'self'",
          "wss://*.onrender.com",
          "https://*.hubspot.com",
          "https://*.hs-analytics.net",
          "https://*.tawk.to",
          "wss://*.tawk.to",
        ],
        fontSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
        ],
        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://www.facebook.com",
          "https://forms.hubspot.com",
          "https://embed.tawk.to",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CSP più restrittiva solo per il pannello Admin
const adminCSP = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "https://cdnjs.cloudflare.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
    objectSrc: ["'none'"],
  },
});

// HSTS (HTTP Strict Transport Security) - Forza HTTPS per 1 anno
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// X-Frame-Options: Previene il Clickjacking
app.use(helmet.frameguard({ action: 'sameorigin' }));

// X-Content-Type-Options: Previene il MIME sniffing
app.use(helmet.noSniff());

// Referrer-Policy: Controlla quante informazioni del referrer vengono inviate
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ==========================
// BODY PARSER
// ==========================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================
// RATE LIMIT
// ==========================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ==========================
// AUTH & ADMIN ROUTES
// ==========================

// Login Route
app.post("/api/auth/login", (req, res) => {
  const { user, pass } = req.body;

  if (
    user === process.env.ADMIN_USER &&
    pass === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: "8h" });
    
    // Set Cookie HttpOnly
    res.cookie("dpcars_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in produzione (HTTPS)
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 ore
    });

    return res.json({ success: true });
  }

  res.status(401).json({ success: false, error: "Credenziali non valide" });
});

// Logout Route
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("dpcars_admin_token");
  res.json({ success: true });
});

// Check Session Route
app.get("/api/auth/check", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.admin.user });
});

const fs = require("fs");

// Admin Page (Protetta da Basic Auth)
app.get("/admin", adminCSP, (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Autenticazione richiesta");
  }

  const credentials = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = credentials.split(":");

  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASSWORD) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Credenziali non valide");
  }

  // Legge il file admin.html e inietta il nonce per la CSP
  try {
    let content = fs.readFileSync(path.join(__dirname, "private", "admin.html"), "utf8");
    content = content.replace(/NONCE_PLACEHOLDER/g, res.locals.nonce);
    res.send(content);
  } catch (err) {
    res.status(500).send("Errore nel caricamento del pannello admin");
  }
});

// Endpoint specifico per il logo admin
app.get("/admin/logo.jpg", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "logo.jpg"));
});

// ==========================
// STATIC FILES
// ==========================

// uploads pubblici
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// frontend statico
app.use(
  express.static(path.join(__dirname, "public"))
);

// Rotte prioritarie per i file SEO
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const Vehicle = require("./models/Vehicle");
    // Recupera solo i veicoli non venduti
    const vehicles = await Vehicle.find({ statoVendita: { $ne: "venduto" } }).lean();
    
    const baseUrl = "https://www.dpcars.it";
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Pagine Statiche Principali -->
  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/#inventory</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${baseUrl}/permuta.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>${baseUrl}/vantaggi/finanziamenti.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/vantaggi/qualita-garantita.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/vantaggi/assistenza-post-vendita.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/blog.html</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/#contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;

    // Aggiungi dinamicamente i veicoli (slug o id)
    // Nota: poiché il sito è una Single Page App che usa i filtri Vue, 
    // potresti non avere pagine di dettaglio separate. 
    // Se avrai pagine tipo /veicolo/:id, scommenta sotto:
    /*
    vehicles.forEach(v => {
      xml += `
  <url>
    <loc>${baseUrl}/veicolo/${v._id}</loc>
    <lastmod>${v.updatedAt ? v.updatedAt.toISOString().split('T')[0] : today}</lastmod>
    <priority>0.8</priority>
  </url>`;
    });
    */

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error("❌ ERRORE GENERAZIONE SITEMAP:", err);
    res.status(500).send("Errore sitemap");
  }
});

// ==========================
// CLOUDINARY CONFIG
// ==========================

require("./cloudinary");

// ==========================
// ROUTES
// ==========================

app.use("/veicoli", require("./routes/veicoli"));
app.use("/api/blog", require("./routes/blog"));
app.use("/api/dpcars", require("./routes/dpcars1"));
app.use("/api/permuta", require("./routes/permuta"));

// ==========================
// TEST ROUTE
// ==========================

app.get("/api/test", (req, res) => {
  res.json({
    message: "DP Cars Backend attivo 🚀"
  });
});

// ==========================
// 404 API HANDLER
// ==========================

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Endpoint API non trovato"
  });
});

// ==========================
// GLOBAL ERROR HANDLER
// ==========================

app.use((err, req, res, next) => {
  console.error("Errore server:", err);
  res.status(500).json({
    error: "Errore interno server"
  });
});

app.get("*any", (req, res) => {
  if (!req.path.match(/^\/(api|admin|uploads|veicoli|robots\.txt|sitemap\.xml)/) && 
      !req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|xml|txt)$/)) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Risorsa non trovata' });
  }
});

// ==========================
// SERVER + WEBSOCKET
// ==========================

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI mancante");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connesso");

    const server = http.createServer(app);

    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws, req) => {
      console.log("🟢 WebSocket connesso:", req.socket.remoteAddress);

      ws.on("message", (message) => {
        console.log("📨 WS messaggio:", message.toString());
      });

      ws.on("close", () => {
        console.log("🔴 WS disconnesso");
      });

      ws.on("error", (err) => {
        console.log("⚠️ WS errore:", err.message);
      });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server avviato su porta ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Errore avvio server:", err.message);
    process.exit(1);
  }
}

start();