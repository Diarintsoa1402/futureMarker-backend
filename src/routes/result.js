/* FICHIER: src/routes/results.js */
const express = require("express");
const router = express.Router();
const { jwtAuth } = require("../middlewares/auth");
const resultController = require("../controllers/resultController");

router.get("/me", jwtAuth, resultController.getMyResults);
router.get("/:id", jwtAuth, resultController.getResultById);

module.exports = router;