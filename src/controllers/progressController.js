// src/controllers/progressController.js
const Project = require("../models/Project");
const Mentorship = require("../models/Mentorship");
const FormationProgress = require("../models/FormationProgress");
const { Op } = require("sequelize");

exports.getGlobalProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Progression Formations (moyenne de toutes les formations)
    const formations = await FormationProgress.findAll({
      where: { userId }
    });

    const formationAvg = formations.length > 0
      ? formations.reduce((acc, f) => acc + f.progress, 0) / formations.length
      : 0;

    const formationsCompleted = formations.filter(f => f.certificateIssued).length;

    // 2. Progression Projet
    const project = await Project.findOne({ where: { userId } });
    const projectProgress = project?.progress || 0;
    const projectStatus = project?.status || "non démarré";

    // 3. Score Mentorat
    const mentorships = await Mentorship.findAll({ where: { womanId: userId } });
    const activeMentorships = mentorships.filter(m => m.status === 'accepté').length;
    const completedMentorships = mentorships.filter(m => m.status === 'terminé').length;
    
    // Score mentorat : 20 points par mentorat actif, 30 par terminé
    const mentorshipScore = Math.min(100, (activeMentorships * 20) + (completedMentorships * 30));

    // 4. Calcul global (pondéré)
    const globalProgress = Math.round(
      (formationAvg * 0.4) + (projectProgress * 0.4) + (mentorshipScore * 0.2)
    );

    // 5. Déterminer statut
    let status, statusColor, recommendations;
    
    if (globalProgress < 33) {
      status = "bas";
      statusColor = "red";
      recommendations = [
        "Commence une formation pour améliorer tes compétences",
        "Crée ou mets à jour ton projet d'entreprise",
        "Demande un mentor pour t'accompagner"
      ];
    } else if (globalProgress < 66) {
      status = "moyen";
      statusColor = "yellow";
      recommendations = [
        "Continue tes formations en cours",
        "Candidate au financement pour ton projet",
        "Planifie des sessions régulières avec ton mentor"
      ];
    } else {
      status = "meilleur";
      statusColor = "green";
      recommendations = [
        "Bravo ! Tu es sur la bonne voie",
        "Pense à finaliser tes formations pour obtenir les certificats",
        "Partage ton expérience avec d'autres femmes"
      ];
    }

    // 6. Statistiques détaillées
    const stats = {
      globalProgress,
      status,
      statusColor,
      recommendations,
      details: {
        formations: {
          score: Math.round(formationAvg),
          total: formations.length,
          completed: formationsCompleted,
          inProgress: formations.length - formationsCompleted
        },
        project: {
          score: projectProgress,
          status: projectStatus,
          exists: !!project
        },
        mentorship: {
          score: mentorshipScore,
          active: activeMentorships,
          completed: completedMentorships,
          total: mentorships.length
        }
      }
    };

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Obtenir l'historique d'évolution
exports.getProgressHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Simuler l'historique (à améliorer avec une table dédiée)
    const history = [];

    const formations = await FormationProgress.findAll({
      where: { userId },
      order: [['updatedAt', 'ASC']]
    });

    formations.forEach(f => {
      history.push({
        date: f.updatedAt,
        type: 'formation',
        progress: f.progress,
        detail: `Formation: ${f.progress}% complétée`
      });
    });

    const project = await Project.findOne({ where: { userId } });
    if (project) {
      history.push({
        date: project.updatedAt,
        type: 'project',
        progress: project.progress,
        detail: `Projet: ${project.progress}%`
      });
    }

    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
