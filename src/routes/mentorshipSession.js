const express = require("express");
const router = express.Router();
const { jwtAuth, requireRole } = require("../middlewares/auth");
const controller = require("../controllers/mentorshipSessionController");

// Mentor
router.post("/", jwtAuth, requireRole(["mentor"]), controller.createSession);
router.put("/:id", jwtAuth, requireRole(["mentor"]), controller.completeSession);
router.put("/:id/cancel", jwtAuth, requireRole(["mentor"]), controller.cancelSession);
router.put("/:id/reschedule", jwtAuth, requireRole(["mentor"]), controller.rescheduleSession);
router.get("/mentor", jwtAuth, requireRole(["mentor"]), controller.getMentorSessions);

// Femme
router.get("/me", jwtAuth, requireRole(["woman"]), controller.getMySessions);

// Public/admin helper (optionnel) : liste de toutes les femmes (pour dropdown frontend)
router.get("/women", jwtAuth, requireRole(["mentor","admin"]), controller.getAllWomen);

module.exports = router;
