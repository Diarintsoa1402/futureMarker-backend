// backend/src/routes/woman.js (NOUVEAU)
const express = require("express");
const { jwtAuth, requireRole } = require("../middlewares/auth");
const formationWoman = require("../controllers/formationWomanController");

const router = express.Router();

// Formations disponibles
router.get("/formations", jwtAuth, requireRole(["woman"]), formationWoman.getAvailableFormations);

// Inscription
router.post("/formations/:formationId/enroll", jwtAuth, requireRole(["woman"]), formationWoman.enrollFormation);

// Mes formations
router.get("/my-formations", jwtAuth, requireRole(["woman"]), formationWoman.getMyFormations);

// Détails formation
router.get("/enrollments/:enrollmentId", jwtAuth, requireRole(["woman"]), formationWoman.getFormationDetails);

// Compléter module
router.post("/enrollments/:enrollmentId/modules/:moduleId/complete", jwtAuth, requireRole(["woman"]), formationWoman.completeModule);

// Progression
router.get("/enrollments/:enrollmentId/progress", jwtAuth, requireRole(["woman"]), formationWoman.getProgress);
// backend/src/routes/woman.js
router.get("/certificates/:enrollmentId/download", jwtAuth, requireRole(["woman"]), formationWoman.downloadCertificate);

module.exports = router;
