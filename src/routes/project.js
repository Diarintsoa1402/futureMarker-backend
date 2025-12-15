// src/routes/project.js
const express = require("express");
const router = express.Router();
const { jwtAuth, requireRole } = require("../middlewares/auth");
const projectController = require("../controllers/projectController");

// ==========================================
// 💼 ROUTES FEMME - SPÉCIFIQUES /my-projects (en premier pour priorité)
// ==========================================

// Obtenir tous ses projets (avec filtres et pagination)
router.get("/my-projects", 
  jwtAuth, 
  requireRole(["woman"]), 
  projectController.getMyProjects
);

// Obtenir un projet spécifique
router.get("/my-projects/:projectId", 
  jwtAuth, 
  requireRole(["woman"]), 
  projectController.getProjectById
);

// Obtenir la progression d'un projet
router.get("/my-projects/:projectId/progress",
  jwtAuth,
  requireRole(["woman", "admin"]),
  projectController.getProjectProgress
);

// Créer une mise à jour de progression pour un projet
router.post("/my-projects/:projectId/updates",
  jwtAuth,
  requireRole(["woman"]),
  projectController.createProjectUpdate
);

// Obtenir les mises à jour d'un projet
router.get("/my-projects/:projectId/updates",
  jwtAuth,
  requireRole(["woman"]),
  projectController.getProjectUpdates
);

// Supprimer une mise à jour
router.delete("/updates/:updateId",
  jwtAuth,
  requireRole(["woman"]),
  projectController.deleteProjectUpdate
);

// ==========================================
// 💼 ROUTES FEMME - GÉNÉRALES (après les spécifiques)
// ==========================================

// Créer un nouveau projet
router.post("/", 
  jwtAuth, 
  requireRole(["woman"]), 
  projectController.createProject
);

// Mettre à jour un projet spécifique
router.put("/:projectId", 
  jwtAuth, 
  requireRole(["woman"]), 
  projectController.updateProject
);

// Supprimer un projet spécifique
router.delete("/:projectId", 
  jwtAuth, 
  requireRole(["woman"]), 
  projectController.deleteProject
);

// Obtenir ses statistiques personnelles
router.get("/my-stats/overview", 
  jwtAuth, 
  requireRole(["woman"]), 
  projectController.getMyStats
);

// ==========================================
// 🧑‍💼 ROUTES ADMIN (en dernier)
// ==========================================

// Obtenir tous les projets avec filtres et pagination
router.get("/", 
  jwtAuth, 
  requireRole(["admin"]), 
  projectController.getAllProjects
);

// Obtenir les statistiques globales des projets
router.get("/stats/overview", 
  jwtAuth, 
  requireRole(["admin"]), 
  projectController.getProjectStats
);

// Mettre à jour le statut d'un projet (admin)
router.patch("/:projectId/status", 
  jwtAuth, 
  requireRole(["admin"]), 
  projectController.updateProjectStatus
);

module.exports = router;

