// ✅ FIX COMPLETO - COPIA E SOSTITUISCI

// 1. app.js (parte SUPERIORE)
const express = require('express');
const basicAuth = require('./middleware/basicAuth'); // percorso tuo file
const Vehicle = require('./models/Vehicle'); // percorso tuo model

const app = express();

// ✅ APPLICA AUTH SOLO A /admin
app.use('/admin', basicAuth);
app.use('/admin/*', basicAuth);

// ✅ ALTRE ROTTE PUBBLICHE (SENZA AUTH)
app.get('/', async (req, res) => {
  try {
    const veicoli = await Vehicle.find({ statoVendita: { $ne: 'Venduto' } })
      .sort({ dataInserimento: -1 })
      .limit(12);
    
    res.render('index', { 
      title: 'DP CARS - Auto e Moto Usate Marcianise',
      veicoli 
    });
  } catch(e) {
    console.error(e);
    res.status(500).render('index', { veicoli: [], error: true });
  }
});

// 2. middleware/basicAuth.js (il tuo è GIÀ PERFETTO)
const adminUser = "dpcars";
const adminPass = "dpcars2026";

function basicAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).send("Autenticazione richiesta");
  }
  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic") return res.sendStatus(400);

  const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
  if (user === adminUser && pass === adminPass) return next();

  res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).send("Credenziali non valide");
}

module.exports = basicAuth;

// 3. npm i pug (se non fatto)
// 4. Crea views/index.pug con i tuoi template
// 5. git add . && git commit -m "Fix SSR public home" && git push
