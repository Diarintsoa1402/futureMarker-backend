
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { jwtAuth } = require("../middlewares/auth");

// ✅ Récupérer le profil de l'utilisateur connecté
router.get("/", jwtAuth, authController.getProfile);

// ✅ Mettre à jour le profil
router.put("/", jwtAuth, authController.updateProfile);

// ✅ Supprimer son compte
router.delete("/", jwtAuth, authController.deleteAccount);

module.exports = router;
