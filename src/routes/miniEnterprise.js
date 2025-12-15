/* FICHIER: src/routes/miniEnterprise.js */
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const miniController = require("../controllers/miniEnterpriseController");
const { jwtAuth } = require("../middlewares/auth");

// Middleware de validation adapté aux enfants
const validateUpsert = [
  body("products").optional().isArray().withMessage("Les produits doivent être dans une liste"),
  body("products.*.name").optional().trim().notEmpty().withMessage("Donne un nom à ton produit !"),
  body("products.*.price").optional().isFloat({ min: 0 }).withMessage("Le prix doit être positif"),
  body("products.*.stock").optional().isInt({ min: 0 }).withMessage("Le stock doit être un nombre entier positif"),
  body("finances.capital").optional().isFloat({ min: 0 }).withMessage("Le capital doit être positif"),
  body("finances.revenue").optional().isFloat({ min: 0 }).withMessage("Les revenus doivent être positifs"),
  body("finances.expenses").optional().isFloat({ min: 0 }).withMessage("Les dépenses doivent être positives")
];

// Middleware de validation pour vente
const validateSale = [
  body("productId").notEmpty().withMessage("L'ID du produit est requis"),
  body("quantity").isInt({ min: 1 }).withMessage("La quantité doit être un nombre positif")
];

// Routes
router.get("/", jwtAuth, miniController.getEnterprise);
router.put("/", jwtAuth, validateUpsert, miniController.upsertEnterprise);
router.post("/sale", jwtAuth, validateSale, miniController.recordSale);
router.get("/sales", jwtAuth, miniController.getSalesHistory);
router.get("/tips", jwtAuth, miniController.getTips);
router.get("/statistics", jwtAuth, miniController.getStatistics);

module.exports = router;