// backend/src/controllers/admin/formationAdminController.js
const  Formation   = require("../models/Formation");
const  FormationModule  = require("../models/FormationModule");
const  FormationEnrollment  = require("../models/FormationEnrollment");

// Créer une formation
exports.createFormation = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      duration,
      imageUrl,
      objectives,
      requirements,
      maxParticipants
    } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: "Titre et durée requis" });
    }

    const formation = await Formation.create({
      title,
      description,
      category,
      level,
      duration,
      imageUrl,
      objectives: JSON.stringify(objectives || []),
      requirements: JSON.stringify(requirements || []),
      maxParticipants,
      createdBy: req.user.id
    });

    return res.status(201).json({
      message: "Formation créée avec succès",
      formation
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Lister toutes les formations
exports.getAllFormations = async (req, res) => {
  try {
    const formations = await Formation.findAll({
      include: [
        {
          model: FormationModule,
          as: "modules"
        },
        {
          model: FormationEnrollment,
          as: "enrollments"
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json({ formations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour formation
exports.updateFormation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const formation = await Formation.findByPk(id);
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }

    // Convertir arrays en JSON
    if (updates.objectives) {
      updates.objectives = JSON.stringify(updates.objectives);
    }
    if (updates.requirements) {
      updates.requirements = JSON.stringify(updates.requirements);
    }

    await formation.update(updates);

    return res.json({
      message: "Formation mise à jour",
      formation
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Supprimer formation
exports.deleteFormation = async (req, res) => {
  try {
    const { id } = req.params;

    const formation = await Formation.findByPk(id);
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }

    // Vérifier s'il y a des inscriptions
    const enrollmentCount = await FormationEnrollment.count({
      where: { formationId: id }
    });

    if (enrollmentCount > 0) {
      return res.status(400).json({
        message: "Impossible de supprimer : des femmes sont inscrites"
      });
    }

    await formation.destroy();

    return res.json({ message: "Formation supprimée" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Ajouter module à formation
exports.addModule = async (req, res) => {
  try {
    const { formationId } = req.params;
    const {
      title,
      description,
      orderIndex,
      contentType,
      contentUrl,
      duration,
      isOptional
    } = req.body;

    const formation = await Formation.findByPk(formationId);
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }

    // Handle duration: if empty string, set to null; if string, parse to int
    let parsedDuration = duration;
    if (duration === '' || duration === null || duration === undefined) {
      parsedDuration = null;
    } else if (typeof duration === 'string') {
      parsedDuration = parseInt(duration, 10);
      if (isNaN(parsedDuration)) {
        return res.status(400).json({ message: "Durée doit être un nombre valide" });
      }
    }

    const module = await FormationModule.create({
      formationId,
      title,
      description,
      orderIndex,
      contentType,
      contentUrl,
      duration: parsedDuration,
      isOptional
    });

    return res.status(201).json({
      message: "Module ajouté",
      module
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Modifier module
exports.updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const updates = req.body;

    const module = await FormationModule.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module introuvable" });
    }

    // Handle duration in updates
    if (updates.duration !== undefined) {
      let parsedDuration = updates.duration;
      if (updates.duration === '' || updates.duration === null) {
        parsedDuration = null;
      } else if (typeof updates.duration === 'string') {
        parsedDuration = parseInt(updates.duration, 10);
        if (isNaN(parsedDuration)) {
          return res.status(400).json({ message: "Durée doit être un nombre valide" });
        }
      }
      updates.duration = parsedDuration;
    }

    await module.update(updates);

    return res.json({
      message: "Module mis à jour",
      module
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Supprimer module
exports.deleteModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const module = await FormationModule.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module introuvable" });
    }

    await module.destroy();

    return res.json({ message: "Module supprimé" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
