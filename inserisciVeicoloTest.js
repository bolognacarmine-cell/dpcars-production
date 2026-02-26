const mongoose = require("mongoose");
const Vehicle = require("./models/Vehicle"); // Assicurati che il path sia corretto

async function inserisciVeicolo() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/dpcarok1");
    console.log("✅ Connesso a MongoDB");

    const nuovoVeicolo = new Vehicle({
      tipo: "auto",
      marca: "Fiat",
      modello: "Panda",
      meseImmatricolazione: 5,
      annoImmatricolazione: 2020,
      categoriaEuro: "Euro 6",
      usato: true,
      chilometri: 50000,
      carburante: "benzina",
      cambio: "manuale",
      colore: "rosso",
      cilindrata: 1200,
      porte: 5,
      prezzo: 8500,
      tipoAuto: "utilitaria",
      descrizioni: [
        "Auto usata in ottime condizioni",
        "Tagliandi regolari",
        "Nessun incidente"
      ],
      immagini: ["/uploads/immagine1.jpg", "/uploads/immagine2.jpg"]
    });

    const saved = await nuovoVeicolo.save();
    console.log("Veicolo inserito:", saved);

    await mongoose.disconnect();
    console.log("Disconnesso da MongoDB");
  } catch (err) {
    console.error("Errore:", err);
  }
}

inserisciVeicolo();
