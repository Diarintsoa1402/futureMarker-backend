const express = require("express");
const router = express.Router();
const { jwtAuth, requireRole } = require("../middlewares/auth");
const controller = require("../controllers/visioController");

// Nouveau : Récupérer détails d'une session (sans modifier statut)
router.get("/:id", jwtAuth, requireRole(["mentor", "woman"]), controller.getVisioById);

// Mentor planifie une visio
router.post("/", jwtAuth, requireRole(["mentor"]), controller.planVisio);

// Mentor/Femme rejoignent une visio (met status en "en cours")
router.get("/:id/join", jwtAuth, requireRole(["mentor", "woman"]), controller.joinVisio);

// Voir toutes les visios d’un utilisateur (mentor => mentorId, woman => femmeId)
router.get("/", jwtAuth, requireRole(["mentor", "woman"]), controller.getMyVisios);

// Annuler une visio (mentor)
router.put("/:id/cancel", jwtAuth, requireRole(["mentor"]), controller.cancelVisio);

// Replanifier une visio (mentor)
router.put("/:id/reschedule", jwtAuth, requireRole(["mentor"]), controller.rescheduleVisio);

module.exports = router;