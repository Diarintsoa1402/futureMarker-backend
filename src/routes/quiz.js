// ============================================
// backend/src/routes/quiz.js
// ============================================
const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const { jwtAuth } = require("../middlewares/auth");

// Routes publiques/authentifiées
router.get("/", quizController.getAllQuizzes);
router.get("/:id", quizController.getQuiz);

// Routes authentifiées
router.post("/:id/submit", jwtAuth, quizController.submitQuiz);
router.get("/user/results", jwtAuth, quizController.getMyResults);
router.get("/user/stats", jwtAuth, quizController.getUserStats);

module.exports = router;