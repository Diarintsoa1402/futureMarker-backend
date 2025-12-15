// src/controllers/projectController.js
const Project = require("../models/Project");
const ProjectUpdate = require("../models/ProjectUpdate"); // Ajout require ici pour cohérence
const User = require("../models/User"); // Ajout pour fetch manuel
const { Op } = require("sequelize");
const sequelize = require("../config/database");

// ✅ Validation helper
const validateProjectData = (data) => {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push("Le titre est requis");
  } else if (data.title.length < 5) {
    errors.push("Le titre doit contenir au moins 5 caractères");
  } else if (data.title.length > 100) {
    errors.push("Le titre ne peut pas dépasser 100 caractères");
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push("La description est requise");
  } else if (data.description.length < 20) {
    errors.push("La description doit contenir au moins 20 caractères");
  } else if (data.description.length > 2000) {
    errors.push("La description ne peut pas dépasser 2000 caractères");
  }

  const funding = parseFloat(data.fundingRequested);
  if (!data.fundingRequested || isNaN(funding)) {
    errors.push("Le montant demandé est requis");
  } else if (funding < 10000) {
    errors.push("Le montant minimum est de 10 000 Ar");
  } else if (funding > 100000000) {
    errors.push("Le montant maximum est de 100 000 000 Ar");
  }

  return errors;
};

// ✅ Créer un projet (supporte maintenant plusieurs projets)
exports.createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, fundingRequested } = req.body;

    // Validation
    const validationErrors = validateProjectData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Données invalides", 
        errors: validationErrors 
      });
    }

    // Vérifier le nombre de projets actifs (limite optionnelle)
    const activeProjects = await Project.count({ 
      where: { 
        userId,
       status: { [Op.in]: ['en cours', 'financé'] }

      } 
    });

    // Limite de 10 projets actifs simultanés (ajustable)
    const MAX_ACTIVE_PROJECTS = 10;
    if (activeProjects >= MAX_ACTIVE_PROJECTS) {
      return res.status(400).json({ 
        message: `Vous ne pouvez pas avoir plus de ${MAX_ACTIVE_PROJECTS} projets actifs simultanément. Terminez ou supprimez certains projets avant d'en créer de nouveaux.` 
      });
    }

    // Créer le projet
    const project = await Project.create({
      userId,
      title: title.trim(),
      description: description.trim(),
      fundingRequested: parseFloat(fundingRequested),
      progress: 0,
      status: "en cours",
    });

    res.status(201).json({
      message: "Projet créé avec succès",
      data: project
    });
  } catch (err) {
    console.error("❌ Erreur création projet:", err);
    res.status(500).json({ 
      message: "Erreur lors de la création du projet",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Mettre à jour un projet spécifique
exports.updateProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = parseInt(req.params.projectId);
    const { title, description, fundingRequested } = req.body;

    // Validation
    const validationErrors = validateProjectData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Données invalides",
        errors: validationErrors
      });
    }

    // Trouver le projet
    const project = await Project.findOne({
      where: {
        id: projectId,
        userId
      }
    });

    if (!project) {
      return res.status(404).json({ 
        message: "Projet introuvable ou vous n'avez pas les droits pour le modifier" 
      });
    }

    // Vérifier si le projet peut être modifié
    if (project.status === "terminé") {
      return res.status(403).json({ 
        message: "Les projets terminés ne peuvent plus être modifiés" 
      });
    }

    // Mettre à jour uniquement les champs autorisés
    const updateData = {
      title: title.trim(),
      description: description.trim(),
      fundingRequested: parseFloat(fundingRequested),
    };

    await project.update(updateData);

    res.json({
      message: "Projet mis à jour avec succès",
      data: project
    });
  } catch (err) {
    console.error("❌ Erreur mise à jour projet:", err);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour du projet",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Obtenir tous les projets de la femme connectée
exports.getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, search, page = 1, limit = 20 } = req.query;

    // Construction de la requête
    const where = { userId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: projects, count } = await Project.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['deletedAt'] }
    });

    // Injecter la progression dynamique
    const projectsWithProgress = await Promise.all(projects.map(async (p) => {
      const lastUpdate = await ProjectUpdate.findOne({
        where: { projectId: p.id },
        order: [['createdAt', 'DESC']]
      });
      const progress = lastUpdate?.progress ?? p.progress ?? 0;
      return { ...p.toJSON(), progress };
    }));

    res.json({
      projects: projectsWithProgress,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("❌ Erreur récupération projets:", err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des projets",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Obtenir un projet spécifique
exports.getProjectById = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = parseInt(req.params.projectId);

    const project = await Project.findOne({
      where: {
        id: projectId,
        userId
      },
      attributes: { exclude: ['deletedAt'] }
    });

    if (!project) {
      return res.status(404).json({ 
        message: "Projet introuvable" 
      });
    }

    res.json(project);
  } catch (err) {
    console.error("❌ Erreur récupération projet:", err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération du projet",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Supprimer un projet spécifique
exports.deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = parseInt(req.params.projectId);

    const project = await Project.findOne({
      where: {
        id: projectId,
        userId
      }
    });

    if (!project) {
      return res.status(404).json({ 
        message: "Projet introuvable" 
      });
    }

    // Empêcher la suppression si le projet est validé ou terminé
    if (project.status === "validé" || project.status === "terminé") {
      return res.status(403).json({ 
        message: "Impossible de supprimer un projet validé ou terminé. Contactez l'administration." 
      });
    }

    await project.destroy();

    res.json({ 
      message: "Projet supprimé avec succès" 
    });
  } catch (err) {
    console.error("❌ Erreur suppression projet:", err);
    res.status(500).json({ 
      message: "Erreur lors de la suppression du projet",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Obtenir les statistiques personnelles
exports.getMyStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const total = await Project.count({ where: { userId } });
    const enCours = await Project.count({ where: { userId, status: "en cours" } });
    const valides = await Project.count({ where: { userId, status: "validé" } });
    const refuses = await Project.count({ where: { userId, status: "refusé" } });
    const termines = await Project.count({ where: { userId, status: "terminé" } });

    const totalFunding = await Project.sum('fundingRequested', { where: { userId } });
    
    const avgProgress = await Project.findAll({
      where: { userId },
      attributes: [[Project.sequelize.fn('AVG', Project.sequelize.col('progress')), 'avgProgress']]
    });

    res.json({
      total,
      byStatus: {
        enCours,
        valides,
        refuses,
        termines
      },
      totalFundingRequested: totalFunding || 0,
      averageProgress: Math.round(avgProgress[0]?.dataValues?.avgProgress || 0)
    });
  } catch (err) {
    console.error("❌ Erreur statistiques personnelles:", err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des statistiques",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ==========================================
// 🧑‍💼 ROUTES ADMIN
// ==========================================

// ✅ Obtenir tous les projets (admin)
exports.getAllProjects = async (req, res) => {
  try {
    const { status, search, userId, page = 1, limit = 20 } = req.query;
    
    // Construction de la requête
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: projects, count } = await Project.findAndCountAll({
      where,
      include: [{
        model: User,
        as: "User",
        attributes: ['id', 'name', 'email']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      projects,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("❌ Erreur récupération projets:", err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des projets",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Obtenir la progression d'un projet
exports.getProjectProgress = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que c'est bien le projet de l'utilisateur ou un admin
    if (project.userId !== userId && !isAdmin) {
      return res.status(403).json({ 
        message: "Vous n'avez pas accès à ce projet" 
      });
    }

    res.json({
      id: project.id,
      title: project.title,
      progress: project.progress,
      status: project.status,
      fundingRequested: project.fundingRequested,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
  } catch (err) {
    console.error("❌ Erreur progression:", err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération de la progression",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Mettre à jour le statut d'un projet (admin)
exports.updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, progress, comments } = req.body;

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Validation des statuts autorisés
    const validStatuses = ["en cours", "validé", "refusé", "terminé"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}` 
      });
    }

    // Validation de la progression
    if (progress !== undefined) {
      const progressNum = parseInt(progress);
      if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
        return res.status(400).json({ 
          message: "La progression doit être entre 0 et 100" 
        });
      }
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = parseInt(progress);
    if (comments) updateData.adminComments = comments;

    await project.update(updateData);

    res.json({
      message: "Statut du projet mis à jour",
      data: project
    });
  } catch (err) {
    console.error("❌ Erreur mise à jour statut:", err);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour du statut",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Créer une mise à jour de progression pour un projet (femme) - CATCH RENFORCÉ + LOGS DB

exports.createProjectUpdate = async (req, res) => {
  let transaction;
  try {
    const userId = parseInt(req.user.id);
    const projectId = parseInt(req.params.projectId);
    const { progress, updateNote } = req.body;

    console.log(`🔍 createProjectUpdate - userId: ${userId}, projectId: ${projectId}, progress: ${progress}`);

    // ✅ UTILISE SEQUELIZE COMME DANS getProjectUpdates (ça marche !)
    const project = await Project.findOne({
      where: { id: projectId },
      attributes: ['id', 'title', 'status', 'userId']
      // Pas de transaction ici (fetch initial, safe sans)
    });

    console.log(`🔍 Sequelize findOne result:`, project ? `${project.title} (owner: ${project.userId})` : 'NULL');

    if (!project) {
      console.log(`❌ Projet ID ${projectId} N'EXISTE PAS en base (Sequelize)`);
      return res.status(404).json({
        message: `Projet introuvable (ID: ${projectId}). Vérifiez que le projet existe.`
      });
    }

    // Vérifier ownership
    if (project.userId !== userId) {
      console.log(`❌ User ${userId} n'est pas owner (owner réel: ${project.userId})`);
      return res.status(403).json({
        message: "Vous n'avez pas les droits sur ce projet"
      });
    }

    // Vérifier statut
    if (project.status === "terminé") {
      return res.status(403).json({
        message: "Impossible de mettre à jour un projet terminé"
      });
    }

    // Validation progression
    const progressNum = parseInt(progress);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      return res.status(400).json({
        message: "La progression doit être entre 0 et 100"
      });
    }

    // ✅ DÉMARRER TRANSACTION
    transaction = await sequelize.transaction();

    // ✅ CRÉER L'UPDATE AVEC SEQUELIZE (pas de raw)
    console.log(`🛠️ Création ProjectUpdate avec Sequelize...`);
    const update = await ProjectUpdate.create({
      projectId,
      progress: progressNum,
      updateNote: updateNote?.trim() || null,
      updatedBy: userId
    }, { transaction });

    console.log(`✅ Mise à jour créée: ID ${update.id}, progress ${update.progress}%`);

    // Mettre à jour le projet (progress global)
    await project.update({
      progress: progressNum
    }, { transaction });

    console.log(`📈 Progression projet mise à jour à ${progressNum}%`);

    // ✅ FIX : FETCH USER AVANT COMMIT (à l'intérieur de la transaction)
    console.log(`👤 Fetch user pour enrichir la réponse...`);
    const user = await User.findByPk(userId, { 
      attributes: ['id', 'name'],
      transaction  // ← Maintenant safe : avant commit
    });

    // COMMIT (après tout, y compris le fetch)
    await transaction.commit();
    console.log(`✅ Transaction committée avec succès`);

    const result = {
      ...update.toJSON(),
      UpdatedBy: user ? user.toJSON() : null
    };

    console.log(`🎉 createProjectUpdate succès complet`);
    res.status(201).json({
      message: "Mise à jour créée avec succès",
      data: result
    });

  } catch (err) {
    if (transaction) {
      // ✅ FIX : Vérifier l'état de la transaction AVANT rollback
      if (transaction.finished !== 'commit') {  // Seulement si pas déjà committé
        try {
          await transaction.rollback();
          console.log(`🔄 Transaction rollback OK`);
        } catch (rbErr) {
          console.error(`❌ Erreur rollback:`, rbErr.message);
        }
      } else {
        console.log(`ℹ️ Transaction déjà committée – pas de rollback nécessaire`);
      }
    }
    
    console.error("❌ Erreur createProjectUpdate:", err.name, err.message);
    console.error("Stack:", err.stack);

    // Gestion erreurs spécifiques (gardé pour debug)
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(404).json({
        message: "Erreur FK: Le projet n'existe pas en base."
      });
    }

    res.status(500).json({
      message: "Erreur lors de la création de la mise à jour",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
// ✅ Obtenir les mises à jour d'un projet (femme) - Inchangé (déjà corrigé)
exports.getProjectUpdates = async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    const projectId = parseInt(req.params.projectId);
    const { page = 1, limit = 10 } = req.query;

    console.log(`🔍 getProjectUpdates - userId: ${userId}, projectId: ${projectId}`);

    // Vérifier que le projet appartient à la femme
    const project = await Project.findOne({
      where: { id: projectId, userId }
    });

    if (!project) {
      console.log(`❌ Projet non trouvé pour userId: ${userId}, projectId: ${projectId}`);
      return res.status(404).json({
        message: "Projet introuvable ou vous n'avez pas les droits"
      });
    }

    console.log(`✅ Projet trouvé: ${project.title}`);

    const offset = (page - 1) * limit;

    // Fetch updates SANS include (évite erreur association)
    const { rows: updates, count } = await ProjectUpdate.findAndCountAll({
      where: { projectId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 ${count} updates trouvés pour projectId: ${projectId}`);

    // Fetch manuel des users pour chaque update (bypass association)
    const updatesWithUsers = await Promise.all(
      updates.map(async (update) => {
        try {
          const user = await User.findByPk(update.updatedBy, { 
            attributes: ['id', 'name'] 
          });
          return { ...update.toJSON(), UpdatedBy: user ? user.toJSON() : null };
        } catch (userErr) {
          console.error(`❌ Erreur fetch User pour updatedBy ${update.updatedBy}:`, userErr.message);
          return { ...update.toJSON(), UpdatedBy: null };
        }
      })
    );

    res.json({
      updates: updatesWithUsers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("❌ Erreur récupération mises à jour (détails):", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({
      message: "Erreur lors de la récupération des mises à jour",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Supprimer une mise à jour (femme - seulement ses propres mises à jour)
exports.deleteProjectUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { updateId } = req.params;

    // Trouver la mise à jour et vérifier qu'elle appartient à la femme
    const update = await ProjectUpdate.findOne({
      where: { id: updateId, updatedBy: userId },
      include: [{
        model: Project,
        where: { userId },
        attributes: [] // Pas besoin d'attributs pour la vérif
      }]
    });

    if (!update) {
      return res.status(404).json({
        message: "Mise à jour introuvable ou vous n'avez pas les droits"
      });
    }

    await update.destroy();

    res.json({
      message: "Mise à jour supprimée avec succès"
    });
  } catch (err) {
    console.error("❌ Erreur suppression mise à jour:", err);
    res.status(500).json({
      message: "Erreur lors de la suppression de la mise à jour",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Obtenir les statistiques globales (admin)
exports.getProjectStats = async (req, res) => {
  try {
    const total = await Project.count();
    const enCours = await Project.count({ where: { status: "en cours" } });
    const valides = await Project.count({ where: { status: "validé" } });
    const refuses = await Project.count({ where: { status: "refusé" } });
    const termines = await Project.count({ where: { status: "terminé" } });

    const totalFunding = await Project.sum('fundingRequested');

    // Nombre de femmes avec au moins un projet
    const uniqueWomen = await Project.count({
      distinct: true,
      col: 'userId'
    });

    res.json({
      total,
      byStatus: {
        enCours,
        valides,
        refuses,
        termines
      },
      totalFundingRequested: totalFunding || 0,
      uniqueWomen
    });
  } catch (err) {
    console.error("❌ Erreur statistiques:", err);
    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};