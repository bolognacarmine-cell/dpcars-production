function basicAuth(req, res, next) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return res.status(500).send("Auth non configurata");
  }

  const auth = req.headers.authorization;
  if (!auth) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).send("Autenticazione richiesta");
  }
  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic") return res.sendStatus(400);

  const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASSWORD) return next();

  res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).send("Credenziali non valide");
}

module.exports = basicAuth;
