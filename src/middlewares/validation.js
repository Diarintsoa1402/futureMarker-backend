/* FICHIER: src/middlewares/validation.js */
const { validationResult } = require("express-validator");

/**
 * Middleware pour valider les requêtes
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Données de requête invalides",
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Middleware pour sanitizer les données de requête
 */
const sanitizeRequest = (req, res, next) => {
  // Sanitizer les données de requête string
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  next();
};

module.exports = {
  validateRequest,
  sanitizeRequest
};