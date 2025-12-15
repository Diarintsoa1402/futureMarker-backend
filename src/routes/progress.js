// src/routes/progress.js
const express = require("express");
const router = express.Router();
const { jwtAuth } = require("../middlewares/auth");
const controller = require("../controllers/progressController");

router.get("/global", jwtAuth, controller.getGlobalProgress);
router.get("/history", jwtAuth, controller.getProgressHistory);

module.exports = router;
