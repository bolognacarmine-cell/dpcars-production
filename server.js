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