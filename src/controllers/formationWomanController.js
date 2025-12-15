// backend/src/controllers/woman/formationWomanController.js
const Formation = require("../models/Formation");
const FormationModule = require("../models/FormationModule");
const FormationEnrollment = require("../models/FormationEnrollment");
const ModuleProgress = require("../models/ModuleProgress");
const index = require("../models/index");
const { generateCertificate } = require("../utils/certificateGenerator");
// Lister formations disponibles
exports.getAvailableFormations = async (req, res) => {
  try {
    const formations = await index.Formation.findAll({
      where: { isActive: true },
      include: [
        {
          model: index.FormationModule,
          as: "modules"
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Parse JSON fields
    const formatted = formations.map(f => {
      const data = f.toJSON();
      data.objectives = JSON.parse(data.objectives || "[]");
      data.requirements = JSON.parse(data.requirements || "[]");
      return data;
    });

    return res.json({ formations: formatted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// S'inscrire à une formation
exports.enrollFormation = async (req, res) => {
  try {
    const { formationId } = req.params;
    const womanId = req.user.id;

    const formation = await Formation.findByPk(formationId);
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }

    // Vérifier si déjà inscrite
    const existing = await FormationEnrollment.findOne({
      where: { formationId, womanId }
    });

    if (existing) {
      return res.status(400).json({ message: "Déjà inscrite à cette formation" });
    }

    // Vérifier capacité max
    const enrolledCount = await FormationEnrollment.count({
      where: { formationId }
    });

    if (enrolledCount >= formation.maxParticipants) {
      return res.status(400).json({ message: "Formation complète" });
    }

    const enrollment = await FormationEnrollment.create({
      formationId,
      womanId,
      status: "inscrite",
      startedAt: new Date()
    });

    return res.status(201).json({
      message: "Inscription réussie",
      enrollment
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mes formations
exports.getMyFormations = async (req, res) => {
  try {
    const womanId = req.user.id;

    const enrollments = await FormationEnrollment.findAll({
      where: { womanId },
      include: [
        {
          model: Formation,
          include: [
            {
              model: FormationModule,
              as: "modules"
            }
          ]
        },
        {
          model: ModuleProgress,
          as: "moduleProgress"
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json({ enrollments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Détails d'une formation inscrite
exports.getFormationDetails = async (req, res) => {
  try {
    // ✅ CONVERTIR EN INTEGER
    const enrollmentId = parseInt(req.params.enrollmentId, 10);
    const womanId = req.user.id;

    // ✅ Vérifier que c'est bien un nombre
    if (isNaN(enrollmentId)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const enrollment = await FormationEnrollment.findOne({
      where: { 
        id: enrollmentId,  // ✅ Maintenant c'est un nombre
        womanId 
      },
      include: [
        {
          model: Formation,
          include: [
            {
              model: FormationModule,
              as: "modules"
            }
          ]
        },
        {
          model: ModuleProgress,
          as: "moduleProgress",
          include: [
            {
              model: FormationModule,
              as: "module"
            }
          ]
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }

    const data = enrollment.toJSON();
    
    // Parse JSON si nécessaire
    if (data.Formation) {
      if (typeof data.Formation.objectives === 'string') {
        data.Formation.objectives = JSON.parse(data.Formation.objectives || "[]");
      }
      if (typeof data.Formation.requirements === 'string') {
        data.Formation.requirements = JSON.parse(data.Formation.requirements || "[]");
      }
    }

    return res.json({ enrollment: data });
  } catch (err) {
    console.error("❌ Erreur getFormationDetails:", err);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
};


// Marquer un module comme complété
exports.completeModule = async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId, 10);
    const moduleId = parseInt(req.params.moduleId, 10);
    const womanId = req.user.id;
    const { timeSpent, notes } = req.body;

    // Vérifier l'enrollment
    const enrollment = await FormationEnrollment.findOne({
      where: { id: enrollmentId, womanId },
      include: [
        {
          model: index.Formation,
          as: 'Formation'
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }

    // Vérifier le module
    const module = await FormationModule.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module introuvable" });
    }

    // Mettre à jour ou créer progression
    let progress = await ModuleProgress.findOne({
      where: { enrollmentId, moduleId }
    });

    if (progress) {
      await progress.update({
        isCompleted: true,
        completedAt: new Date(),
        timeSpent: timeSpent || progress.timeSpent,
        notes: notes || progress.notes
      });
    } else {
      progress = await ModuleProgress.create({
        enrollmentId,
        moduleId,
        isCompleted: true,
        completedAt: new Date(),
        timeSpent: timeSpent || 0,
        notes: notes || null
      });
    }

    // Recalculer progression globale
    const totalModules = await FormationModule.count({
      where: { formationId: enrollment.formationId }
    });

    const completedModules = await ModuleProgress.count({
      where: {
        enrollmentId,
        isCompleted: true
      }
    });

    const newProgress = (completedModules / totalModules) * 100;

    await enrollment.update({
      progress: newProgress,
      status: newProgress === 100 ? "terminée" : "en_cours"
    });

    // Si 100%, générer certificat PDF
    if (newProgress === 100 && !enrollment.completedAt) {
      try {
        // Récupérer les informations de l'utilisateur
        const woman = await index.User.findByPk(womanId);

        if (!woman) {
          console.error('❌ Utilisateur non trouvé pour génération certificat');
          return res.status(500).json({ message: "Erreur: utilisateur non trouvé" });
        }

        // Générer le certificat
        const certificateUrl = await generateCertificate(
          enrollment,
          enrollment.Formation,
          woman
        );

        await enrollment.update({
          completedAt: new Date(),
          certificateIssuedAt: new Date(),
          certificateUrl
        });

        console.log(`✅ Certificat généré: ${certificateUrl}`);
      } catch (certErr) {
        console.error('❌ Erreur génération certificat:', certErr);
        // Ne pas bloquer la complétion si le certificat échoue
        return res.status(500).json({ message: "Formation complétée mais erreur certificat" });
      }
    }

    return res.json({
      message: "Module complété",
      progress,
      enrollment
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Consulter progression
exports.getProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const womanId = req.user.id;

    const enrollment = await FormationEnrollment.findOne({
      where: { id: enrollmentId, womanId },
      include: [
        {
          model: Formation
        },
        {
          model: ModuleProgress,
          as: "moduleProgress",
          include: [
            {
              model: FormationModule,
              as: "module"
            }
          ]
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }

    const totalModules = await FormationModule.count({
      where: { formationId: enrollment.formationId }
    });

    const completedModules = enrollment.moduleProgress.filter(
      p => p.isCompleted
    ).length;

    const progressLevel =
      enrollment.progress < 33
        ? "bas"
        : enrollment.progress < 66
        ? "moyen"
        : "meilleur";

    return res.json({
      enrollment,
      stats: {
        totalModules,
        completedModules,
        progressPercent: enrollment.progress,
        progressLevel,
        certificateUrl: enrollment.certificateUrl
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
// backend/src/controllers/woman/formationWomanController.js
exports.downloadCertificate = async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId, 10);
    const womanId = req.user.id;

    const enrollment = await FormationEnrollment.findOne({
      where: { id: enrollmentId, womanId }
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }

    if (!enrollment.certificateUrl) {
      return res.status(404).json({ message: "Certificat non disponible" });
    }

    const filepath = path.join(__dirname, '../../public', enrollment.certificateUrl);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: "Fichier certificat introuvable" });
    }

    res.download(filepath, `certificat_formation_${enrollment.id}.pdf`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};