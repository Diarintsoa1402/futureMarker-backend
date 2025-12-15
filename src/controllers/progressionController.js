const MentorshipSession = require("../models/MentorshipSessions");

exports.getProgression = async (req, res) => {
  try {
    const femmeId = req.user.id;

    // Récupère toutes les sessions de cette femme
    const sessions = await MentorshipSession.findAll({ where: { femmeId } });

    if (sessions.length === 0)
      return res.json({ level: "Aucune session", percent: 0 });

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === "terminée").length;
    const percent = Math.round((completed / total) * 100);

    let level;
    if (percent <= 30) level = "Bas";
    else if (percent <= 70) level = "Moyen";
    else level = "Meilleur";

    res.json({ total, completed, percent, level });
  } catch (err) {
    console.error("Erreur progression:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
