console.log("SERVER FILE:", __filename);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// ==========================
// SECURITY
// ==========================

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

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
// ADMIN BASIC AUTH
// ==========================

app.get("/admin", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Autenticazione richiesta");
  }

  const credentials = Buffer.from(
    auth.split(" ")[1],
    "base64"
  ).toString();

  const [user, pass] = credentials.split(":");

  if (
    user !== process.env.ADMIN_USER ||
    pass !== process.env.ADMIN_PASSWORD
  ) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Credenziali non valide");
  }

  res.sendFile(
    path.join(__dirname, "private", "admin.html")
  );
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

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
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
app.use("/api/dpcars", require("./routes/dpcars1"));   // ← Aggiunta corretta qui

// ✅ Route HTML per pagine articoli vantaggi (AGGIUNGI QUI)
app.get('/vantaggi/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
       const Dpcars1 = mongoose.model('Dpcars1'); // Più sicuro
 
        
        const articolo = await Dpcars1.findOne({ slug }).lean();

        if (!articolo) {
            return res.status(404).send(`
                <div class="container mt-5 p-5 text-center text-white bg-dark rounded">
                    <h1 class="display-1">404</h1>
                    <h2>Vantaggio non trovato</h2>
                    <a href="/" class="btn btn-primary btn-lg mt-3">← Torna alla home</a>
                </div>
            `);
        }

        res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articolo.titolo} | DP CARS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; }
        .navbar-brand img { height: 45px; }
        .hero-image { max-height: 500px; object-fit: cover; }
    </style>
</head>
<body>
    <!-- Header -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-black fixed-top py-2">
        <div class="container">
            <a href="/" class="navbar-brand d-flex align-items-center">
                <img src="/logo-og.jpg" alt="DP CARS" class="me-3">
                <span class="fw-bold fs-3">DP CARS</span>
            </a>
            <a href="/" class="btn btn-outline-light px-4">
                <i class="fas fa-arrow-left me-2"></i>Torna ai vantaggi
            </a>
        </div>
    </nav>

    <div class="container-fluid mt-5 pt-5 min-vh-100">
        <div class="row justify-content-center">
            <div class="col-lg-9 col-xl-8">
                <!-- Titolo -->
                <header class="text-center mb-5">
                    <h1 class="display-3 fw-bold mb-0">${articolo.titolo}</h1>
                    <div class="vantaggio-icon fs-1 text-primary mt-4 mb-4">
                        <i class="fas fa-${articolo.icona || 'star'}"></i>
                    </div>
                </header>

                <!-- Immagine (se presente) -->
                ${articolo.immagine ? 
                    `<div class="text-center mb-5">
                        <img src="${articolo.immagine.replace('/upload/', '/upload/f_auto,q_auto,w_1000,c_scale/')}" 
                             alt="${articolo.titolo}" 
                             class="img-fluid rounded-4 shadow-lg hero-image">
                    </div>` : ''}

                <!-- Contenuto principale -->
                <article class="bg-black p-5 rounded-4 shadow-lg">
                    <div class="fs-4 lh-lg">${articolo.contenuto || articolo.descrizione || articolo.anteprima}</div>
                </article>

                <!-- CTA finale -->
                <div class="text-center mt-5">
                    <a href="/" class="btn btn-primary btn-lg px-5 py-3">
                        <i class="fas fa-rocket me-2"></i>Scopri tutti i vantaggi
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
        `);
    } catch (error) {
        console.error('Errore pagina vantaggi:', error);
        res.status(500).send('Errore server');
    }
});

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

app.get("/{*path}", (req, res) => {
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