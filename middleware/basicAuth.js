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
