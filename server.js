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

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit (puoi anche applicarlo solo a /api e /veicoli)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// PROTEZIONE admin.html
app.get("/admin.html", (req, res) => {
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

  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Cloudinary (se serve)
require("./cloudinary");

// Routes
app.use("/veicoli", require("./routes/veicoli"));

app.get("/api/test", (req, res) => {
  res.json({ message: "DP Cars Backend + Cloudinary 🏁" });
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI mancante");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connesso");

    const server = http.createServer(app);

    const wss = new WebSocketServer({ server });
    wss.on("connection", (ws, req) => {
      console.log("🟢 WS connesso:", req.url || "/");

      ws.on("message", (message) => {
        console.log("📨 WS messaggio:", message.toString());
      });

      ws.on("close", () => console.log("🔴 WS disconnesso"));
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server HTTP + WS su porta ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Errore:", err.message);
    process.exit(1);
  }
}

start();
