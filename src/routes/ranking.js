/* FICHIER: src/routes/ranking.js */
const express = require("express");
const router = express.Router();
const rankingController = require("../controllers/rankingController");
const { jwtAuth } = require("../middlewares/auth");

/* Classement global */
router.get("/", jwtAuth, rankingController.getRanking);

/* Rang de l'utilisateur connecté */
router.get("/me", jwtAuth, rankingController.getUserRank);

module.exports = router;