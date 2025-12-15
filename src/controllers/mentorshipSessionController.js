const MentorshipSession = require("../models/MentorshipSessions");
const User = require("../models/User");
const { Op } = require("sequelize");

/**
 * Helpers:
 * - check if femme exists
 * - check schedule conflict for femme or mentor
 */
async function checkUserExists(id) {
  return await User.findByPk(id);
}

async function hasConflict({ userId, date, excludeSessionId = null, role = "femme" }) {
  // check whether the user (femme or mentor) has another session at the same time (+/- 30min tolerance optional)
  const where = {
    date,
  };
  if (excludeSessionId) where.id = { [Op.ne]: excludeSessionId };

  // Check exact date conflicts for simplicity; you can adjust to range
  const conflict = await MentorshipSession.findOne({
    where: {
      [role === "femme" ? "femmeId" : "mentorId"]: userId,
      date,
      ...(excludeSessionId ? { id: { [Op.ne]: excludeSessionId } } : {}),
      status: { [Op.ne]: "annulée" },
    },
  });
  return !!conflict;
}

// Create session (mentor)
exports.createSession = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { femmeId, theme, date } = req.body;

    if (!femmeId || !theme || !date)
      return res.status(400).json({ message: "Champs manquants" });

    // check femme exists
    const femme = await checkUserExists(femmeId);
    if (!femme) return res.status(404).json({ message: "La femme ciblée n'existe pas" });

    // check for conflicts for femme and mentor at same date
    if (await hasConflict({ userId: femmeId, date, role: "femme" }))
      return res.status(409).json({ message: "La femme a déjà une session à cette date" });

    if (await hasConflict({ userId: mentorId, date, role: "mentor" }))
      return res.status(409).json({ message: "Vous avez déjà une session à cette date" });

    const session = await MentorshipSession.create({
      mentorId,
      femmeId,
      theme,
      date,
      status: "planifiée",
    });

    res.status(201).json({ message: "Session planifiée ✅", session });
  } catch (err) {
    console.error("Erreur création session:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Complete session (mentor) with notes
exports.completeSession = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const session = await MentorshipSession.findOne({ where: { id, mentorId } });
    if (!session) return res.status(404).json({ message: "Session introuvable" });

    await session.update({ status: "terminée", notes });
    res.json({ message: "Session terminée ✅", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Cancel session (mentor)
exports.cancelSession = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body; // optional

    const session = await MentorshipSession.findOne({ where: { id, mentorId } });
    if (!session) return res.status(404).json({ message: "Session introuvable" });

    await session.update({ status: "annulée", cancelReason: reason || null });
    res.json({ message: "Session annulée ❌", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Reschedule session (mentor)
exports.rescheduleSession = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { date } = req.body;

    if (!date) return res.status(400).json({ message: "Nouvelle date manquante" });

    const session = await MentorshipSession.findOne({ where: { id, mentorId } });
    if (!session) return res.status(404).json({ message: "Session introuvable" });

    // check conflicts
    if (await hasConflict({ userId: session.femmeId, date, excludeSessionId: id, role: "femme" }))
      return res.status(409).json({ message: "La femme a déjà une session à cette date" });

    if (await hasConflict({ userId: mentorId, date, excludeSessionId: id, role: "mentor" }))
      return res.status(409).json({ message: "Vous avez déjà une session à cette date" });

    await session.update({ date, status: "planifiée" });
    res.json({ message: "Session replanifiée 📅", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Get sessions for the mentor
exports.getMentorSessions = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const sessions = await MentorshipSession.findAll({
      where: { mentorId },
      include: [{ as: "femme", model: User, attributes: ["id", "name", "email"] }],
      order: [["date", "DESC"]],
    });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Get sessions for the woman
exports.getMySessions = async (req, res) => {
  try {
    const femmeId = req.user.id;
    const sessions = await MentorshipSession.findAll({
      where: { femmeId },
      include: [{ as: "mentor", model: User, attributes: ["id", "name", "email"] }],
      order: [["date", "DESC"]],
    });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Get all women (for mentor dropdown). Requires mentor/admin role.
exports.getAllWomen = async (req, res) => {
  try {
    const women = await User.findAll({
      where: { role: "woman" },
      attributes: ["id", "name", "email"],
      order: [["name", "ASC"]],
    });
    res.json(women);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
