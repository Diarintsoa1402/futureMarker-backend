const express = require("express");
const router = express.Router();
const { jwtAuth, requireRole } = require("../middlewares/auth");
const controller = require("../controllers/progressionController");

// 👩 FEMME
router.get("/", jwtAuth, requireRole(["woman"]), controller.getProgression);

module.exports = router;
