/* FICHIER: src/routes/courses.js */
const express = require("express");
const router = express.Router();
const coursesController = require("../controllers/coursesController");
const { jwtAuth } = require("../middlewares/auth");

// Public
router.get("/", coursesController.getAllCourses);
router.get("/categories", coursesController.getCategories);
router.get("/search", coursesController.searchCourses);
router.get("/:id", jwtAuth, coursesController.getCourse);


// Auth required
router.post("/progress", jwtAuth, coursesController.saveProgress);
router.post("/progress/complete-support", jwtAuth, coursesController.completeSupport);
router.get("/progress/:userId", jwtAuth, coursesController.getProgress);
router.get("/:courseId/progress", jwtAuth, coursesController.getCourseProgress);
router.delete("/:courseId/progress", jwtAuth, coursesController.resetProgress);
module.exports = router;