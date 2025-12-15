const express = require("express");
const router = express.Router();
const { jwtAuth, requireRole } = require("../middlewares/auth");
const controller = require("../controllers/mentorController")

// 🧑‍🏫 Voir les femmes mentorées
router.get("/mentees", jwtAuth, requireRole(["mentor"]), controller.getMyMentees);
router.get("/projects", jwtAuth, requireRole(["mentor"]), controller.getMenteesProjects);
module.exports = router;
