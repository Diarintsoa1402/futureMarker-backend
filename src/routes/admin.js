/* FICHIER: src/routes/admin.js */
const express = require("express");
const { jwtAuth, requireRole } = require("../middlewares/auth");
const courseAdmin = require("../controllers/adminCourseController");
const quizAdmin = require("../controllers/adminQuizController");
const formationAdmin = require("../controllers/formationAdminController");
const router = express.Router();


// Cours Admin
router.get("/courses", jwtAuth, requireRole(["admin"]), courseAdmin.getAllCoursesAdmin);
router.get("/courses/stats", jwtAuth, requireRole(["admin"]), courseAdmin.getCourseStats);
router.post("/courses", jwtAuth, requireRole(["admin"]), courseAdmin.createCourse);
router.put("/courses/:id", jwtAuth, requireRole(["admin"]), courseAdmin.updateCourse);
router.patch("/courses/:id/publish", jwtAuth, requireRole(["admin"]), courseAdmin.togglePublish);
router.delete("/courses/:id", jwtAuth, requireRole(["admin"]), courseAdmin.deleteCourse);
router.post("/courses/:id/duplicate", jwtAuth, requireRole(["admin"]), courseAdmin.duplicateCourse);

// Quiz Admin Routes
router.get("/quizzes", jwtAuth, requireRole(["admin"]), quizAdmin.getAllQuizzes);
router.post("/quizzes", jwtAuth, requireRole(["admin"]), quizAdmin.createQuiz);
router.put("/quizzes/:id", jwtAuth, requireRole(["admin"]), quizAdmin.updateQuiz);
router.delete("/quizzes/:id", jwtAuth, requireRole(["admin"]), quizAdmin.deleteQuiz);
router.post("/quizzes/:quizId/questions", jwtAuth, requireRole(["admin"]), quizAdmin.addQuestion);
router.delete("/questions/:questionId", jwtAuth, requireRole(["admin"]), quizAdmin.deleteQuestion);

//Formation
// Formations
router.post("/formations", jwtAuth, requireRole(["admin"]), formationAdmin.createFormation);
router.get("/formations", jwtAuth, requireRole(["admin"]), formationAdmin.getAllFormations);
router.put("/formations/:id", jwtAuth, requireRole(["admin"]), formationAdmin.updateFormation);
router.delete("/formations/:id", jwtAuth, requireRole(["admin"]), formationAdmin.deleteFormation);

// Modules
router.post("/formations/:formationId/modules", jwtAuth, requireRole(["admin"]), formationAdmin.addModule);
router.put("/modules/:moduleId", jwtAuth, requireRole(["admin"]), formationAdmin.updateModule);
router.delete("/modules/:moduleId", jwtAuth, requireRole(["admin"]), formationAdmin.deleteModule);


module.exports = router;