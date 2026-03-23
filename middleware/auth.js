const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dpcars-secret-key-2026";

const authMiddleware = (req, res, next) => {
  const token = req.cookies.dpcars_admin_token;

  if (!token) {
    return res.status(401).json({ error: "Accesso negato. Sessione scaduta." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.clearCookie("dpcars_admin_token");
    return res.status(403).json({ error: "Sessione non valida." });
  }
};

module.exports = authMiddleware;