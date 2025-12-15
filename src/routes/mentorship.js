const express = require("express");
const router = express.Router();
const { jwtAuth, requireRole } = require("../middlewares/auth");
const controller = require("../controllers/mentorshipController");

// 👩 Femme
router.post("/", jwtAuth, requireRole(["woman"]), controller.requestMentor);
router.get("/mentors", jwtAuth, requireRole(["woman"]), controller.getAvailableMentors);

// 🧑‍🏫 Mentor
router.get("/", jwtAuth, requireRole(["mentor", "admin"]), controller.getRequests);
router.put("/:id", jwtAuth, requireRole(["mentor"]), controller.reviewRequest);

module.exports = router;