const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware per JSON
app.use(express.json());

// Statici: cartella public
app.use(express.static(path.join(__dirname, "public")));

// Espone la cartella uploads per le immagini caricate
app.use('/uploads', express.static(path.join(__dirname, "public/uploads")));

mongoose.connect("mongodb://127.0.0.1:27017/dpcarok1")
  .then(() => console.log("✅ MongoDB connesso con Mongoose"))
  .catch((err) => {
    console.error("Errore connessione MongoDB:", err);
    process.exit(1);
  });

// Importa il router veicoli
const veicoliRouter = require("./routes/veicoli");
app.use("/veicoli", veicoliRouter);

// Avvio server
app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
});
