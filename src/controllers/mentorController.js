const MentorshipRequest = require("../models/Mentorship");
const MentorshipSession = require("../models/MentorshipSessions");
const User = require("../models/User");
const Project = require("../models/Project");
// 🧑‍🏫 Voir les femmes qu’il mentor
exports.getMyMentees = async (req, res) => {
  try {
    const mentorId = req.user.id;

    // Récupère les demandes acceptées pour ce mentor
    const requests = await MentorshipRequest.findAll({
      where: { mentorId, status: "accepté" },
      include: [{ as: "femme", model: User, attributes: ["id", "name", "email"] }],
    });

    if (requests.length === 0)
      return res.json({ message: "Aucune femme mentorée pour l’instant." });

    // Récupère aussi le nombre de sessions pour chaque femme
    const mentees = await Promise.all(
      requests.map(async (reqItem) => {
        const sessions = await MentorshipSession.findAll({
          where: { mentorId, femmeId: reqItem.userId },
        });

        const total = sessions.length;
        const done = sessions.filter(s => s.status === "terminée").length;
        const progress = total ? Math.round((done / total) * 100) : 0;

        return {
          id: reqItem.femme.id,
          name: reqItem.femme.name,
          email: reqItem.femme.email,
          progress,
        };
      })
    );

    res.json(mentees);
  } catch (err) {
    console.error("Erreur getMyMentees:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🧑‍🏫 Voir les projets des femmes mentorées
exports.getMenteesProjects = async (req, res) => {
  try {
    const mentorId = req.user.id;

    // Récupère les femmes dont la demande est acceptée
    const requests = await MentorshipRequest.findAll({
      where: { mentorId, status: "accepté" },
      include: [{ as: "femme", model: User, attributes: ["id", "name", "email"] }],
    });

    if (requests.length === 0)
      return res.json({ message: "Aucune femme mentorée pour le moment." });

    // Récupère les projets de chaque femme
    const projectsData = await Promise.all(
      requests.map(async (reqItem) => {
        const project = await Project.findOne({
          where: { userId: reqItem.userId },
          attributes: ["id", "title", "description", "status", "fundingRequested", "fundingReceived", "progress"],
        });

        return {
          femme: {
            id: reqItem.femme.id,
            name: reqItem.femme.name,
            email: reqItem.femme.email,
          },
          project: project || null,
        };
      })
    );

    res.json(projectsData);
  } catch (err) {
    console.error("Erreur getMenteesProjects:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};