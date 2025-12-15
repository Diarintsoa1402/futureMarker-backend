/* FICHIER: src/middlewares/auth.js */
const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");

exports.jwtAuth = async (req, res, next) => {
try {
const auth = req.headers.authorization;
if (!auth) return res.status(401).json({ message: "Token manquant" });
const token = auth.split(" ")[1];
if (!token) return res.status(401).json({ message: "Token manquant" });

const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (!decoded || !decoded.id) return res.status(401).json({ message: "Token invalide" });

const user = await User.findByPk(decoded.id);
if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });

req.user = { id: user.id, name: user.name, role: user.role, email: user.email };
next();


} catch (err) {
console.error("Auth error:", err);
return res.status(401).json({ message: "Authentification échouée" });
}
};
exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Non authentifié" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès interdit" });
    }
    next();
  };
};

exports.optionalAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      req.user = null;
      return next();
    }
    const token = auth.split(" ")[1];
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      req.user = null;
      return next();
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = { id: user.id, name: user.name, role: user.role, email: user.email };
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};
