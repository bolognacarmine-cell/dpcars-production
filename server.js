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

// Helper per escape HTML (prevenzione XSS)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

// 🔥 VERSIONE PREMIUM - Pagina articolo migliorata
app.get('/vantaggi/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const Dpcars1 = mongoose.model('Dpcars1');
        
        const articolo = await Dpcars1.findOne({ slug }).lean();

        if (!articolo) {
            return res.status(404).send(`
                <div class="vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
                    <div class="text-center p-5">
                        <i class="fas fa-search fa-5x mb-4 opacity-50"></i>
                        <h1 class="display-1 fw-bold mb-3">404</h1>
                        <h2 class="fs-2 mb-4">Vantaggio non trovato</h2>
                        <a href="/" class="btn btn-primary btn-lg px-5 py-3">
                            <i class="fas fa-home me-2"></i>Torna alla home
                        </a>
                    </div>
                </div>
            `);
        }

        res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(articolo.titolo)} | DP CARS Marcianise</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #e11d48;
            --dark: #0a0a0a;
            --dark2: #111;
            --glass: rgba(255,255,255,0.05);
        }
        * { font-family: 'Inter', sans-serif; }
        body { 
            background: linear-gradient(135deg, var(--dark) 0%, #1a1a1a 100%);
            color: #fff; 
            overflow-x: hidden;
        }
        .navbar { backdrop-filter: blur(20px); background: rgba(10,10,10,0.95); }
        .hero-section { min-height: 60vh; display: flex; align-items: center; }
        .article-card { 
            background: linear-gradient(145deg, var(--dark2), var(--dark));
            backdrop-filter: blur(20px); border: 1px solid var(--glass);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .icon-hero { 
            background: linear-gradient(135deg, var(--primary), #ff4569);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .content-html { line-height: 1.8; }
        .content-html h2 { color: var(--primary); font-weight: 700; }
        .content-html h3 { color: #fff; }
        .btn-cta { 
            background: linear-gradient(135deg, var(--primary), #ff4569);
            border: none; font-weight: 600; box-shadow: 0 10px 30px rgba(225,29,72,0.4);
        }
        .btn-cta:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(225,29,72,0.6); }
    </style>
</head>
<body>
    <!-- NAVBAR PREMIUM -->
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top py-3">
        <div class="container">
            <a href="/" class="navbar-brand d-flex align-items-center text-white">
                <img src="/logo-og.jpg" alt="DP CARS" class="rounded me-3" style="height:50px; border:2px solid rgba(225,29,72,0.5);">
                <div>
                    <div class="fw-bold fs-3 lh-1">DP CARS</div>
                    <small class="text-muted">Marcianise (CE)</small>
                </div>
            </a>
            <a href="/" class="btn btn-outline-light px-4 py-2 rounded-pill">
                <i class="fas fa-arrow-left me-2"></i>Vantaggi
            </a>
        </div>
    </nav>

    <!-- HERO SECTION -->
    <section class="hero-section pt-5 mt-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-10 text-center">
                    <div class="icon-hero mb-4">
                        <i class="fas fa-${escapeHtml(articolo.icona) || 'star'} fa-6x"></i>
                    </div>
                    <h1 class="display-2 fw-800 mb-4 lh-1" style="text-shadow: 0 0 40px rgba(225,29,72,0.6);">
                        ${escapeHtml(articolo.titolo)}
                    </h1>
                    <p class="lead fs-4 opacity-90 mb-0">${escapeHtml(articolo.anteprima)}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- ARTICOLO PRINCIPALE -->
    <section class="py-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-10 col-xl-9">
                    <!-- IMMAGINE COPERTINA -->
                    ${articolo.immagine ? `
                    <div class="text-center mb-5">
                        <img src="${escapeHtml(articolo.immagine.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_scale/'))}" 
                             alt="${escapeHtml(articolo.titolo)}" 
                             class="img-fluid rounded-4 shadow-lg" 
                             style="max-height:500px; width:100%; object-fit:cover;">
                    </div>
                    ` : ''}

                    <!-- CONTENT CARD PREMIUM -->
                    <article class="article-card p-5 p-lg-7 rounded-5">
                        <div class="content-html">${articolo.contenuto}</div>
                    </article>
                </div>
            </div>
        </div>
    </section>

    <!-- 🔥 CTA PREMIUM CON WHATSAPP -->
<section class="py-5" style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);">
    <div class="container text-center py-5">
        <h2 class="display-5 fw-bold mb-4" style="color: #e11d48; text-shadow: 0 0 30px rgba(225,29,72,0.5);">
            Pronto per la tua prossima auto?
        </h2>
        <p class="lead fs-4 opacity-90 mb-5 pb-4">Scopri tutti i nostri vantaggi o scrivici su WhatsApp!</p>
        
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="d-flex flex-column flex-lg-row gap-3 justify-content-center">
                    <!-- SCROLL AI VANTAGGI -->
                    <a href="/#vantaggi-grid" class="btn btn-primary btn-lg px-5 py-3 shadow-lg fs-5" style="
                        background: linear-gradient(135deg, #e11d48, #ff4569) !important;
                        border: none; font-weight: 600;
                        box-shadow: 0 15px 35px rgba(225,29,72,0.4);
                    ">
                        <i class="fas fa-thumbs-up me-2"></i>Tutti i Vantaggi
                    </a>
                    
                    <!-- WHATSAPP PERSONALIZZATO -->
                    <a href="https://wa.me/393333330834?text=Ciao%20DP%20CARS!%20Mi%20interessa%20${encodeURIComponent(escapeHtml(articolo.titolo))}%20%F0%9F%9A%97%0AVorrei%20maggiori%20informazioni!" 
                       class="btn btn-success btn-lg px-5 py-3 shadow-lg fs-5" target="_blank" style="
                        background: linear-gradient(135deg, #25D366, #128C7E) !important;
                        border: none; font-weight: 600;
                        box-shadow: 0 15px 35px rgba(37,211,102,0.4);
                    ">
                        <i class="fab fa-whatsapp me-2"></i>WhatsApp Ora
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
        `);
    } catch (error) {
        console.error('Errore vantaggi:', error);
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
