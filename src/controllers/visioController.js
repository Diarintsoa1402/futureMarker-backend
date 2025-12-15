const VisioSession = require("../models/VisioSession");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

/**
 * Helpers
 */
async function checkUserExists(id) {
  return await User.findByPk(id);
}

async function hasConflict({ userId, scheduledAt, excludeId = null, role = "femme" }) {
  // Simpliste : vérifie si l'utilisateur a déjà une visio à la même date (ignore annulées)
  const where = {
    [role === "femme" ? "femmeId" : "mentorId"]: userId,
    scheduledAt,
    status: { [Op.ne]: "annulée" },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const conflict = await VisioSession.findOne({ where });
  return !!conflict;
}

/**
 * Nouveau : getVisioById (preview détails sans update)
 */
exports.getVisioById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const visio = await VisioSession.findByPk(id, {
      include: [
        { model: User, as: "mentor", attributes: ["id", "name", "email"] },
        { model: User, as: "femme", attributes: ["id", "name", "email"] },
      ],
    });

    if (!visio) return res.status(404).json({ message: "Session introuvable" });

    if (visio.femmeId !== userId && visio.mentorId !== userId)
      return res.status(403).json({ message: "Accès refusé" });

    res.json(visio);
  } catch (err) {
    console.error("Erreur getVisioById:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * planVisio (mentor)
 */
exports.planVisio = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { femmeId, scheduledAt } = req.body;

    if (!femmeId || !scheduledAt)
      return res.status(400).json({ message: "Champs manquants" });

    const femme = await checkUserExists(femmeId);
    if (!femme) return res.status(404).json({ message: "La femme ciblée n'existe pas" });

    // conflits
    if (await hasConflict({ userId: femmeId, scheduledAt, role: "femme" }))
      return res.status(409).json({ message: "La femme a déjà une visio à cette date" });

    if (await hasConflict({ userId: mentorId, scheduledAt, role: "mentor" }))
      return res.status(409).json({ message: "Vous avez déjà une visio à cette date" });

    const link = `https://meet.jit.si/futuremakershub-${uuidv4()}`;

    const visio = await VisioSession.create({
      mentorId,
      femmeId,
      scheduledAt,
      link,
      status: "planifiée",
    });

    res.status(201).json({ message: "Visio planifiée ✅", visio });
  } catch (err) {
    console.error("Erreur planVisio:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * joinVisio
 */
exports.joinVisio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const visio = await VisioSession.findByPk(id);
    if (!visio) return res.status(404).json({ message: "Session introuvable" });

    if (visio.femmeId !== userId && visio.mentorId !== userId)
      return res.status(403).json({ message: "Accès refusé" });

    // marque "en cours" si elle était "planifiée"
    let updated = false;
    if (visio.status !== "en cours") {
      await visio.update({ status: "en cours" });
      updated = true;
    }

    // TODO : Si updated, envoyer notification à l'autre participant (ex: email, websocket, push)
    // Exemple : await sendNotification(otherUserId, "La session visio a commencé !");

    // Retourne link + scheduledAt pour affichage frontend
    res.json({ 
      link: visio.link, 
      scheduledAt: visio.scheduledAt,
      status: visio.status 
    });
  } catch (err) {
    console.error("Erreur joinVisio:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * getMyVisios
 */
exports.getMyVisios = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const filter = role === "mentor" ? { mentorId: userId } : { femmeId: userId };
    const visios = await VisioSession.findAll({
      where: filter,
      include: [
        { model: User, as: "mentor", attributes: ["id", "name", "email"] },
        { model: User, as: "femme", attributes: ["id", "name", "email"] },
      ],
      order: [["scheduledAt", "DESC"]],
    });

    res.json(visios);
  } catch (err) {
    console.error("Erreur getMyVisios:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * cancelVisio (mentor)
 */
exports.cancelVisio = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const visio = await VisioSession.findOne({ where: { id, mentorId } });
    if (!visio) return res.status(404).json({ message: "Session introuvable" });

    await visio.update({ status: "annulée", cancelReason: reason || null });
    res.json({ message: "Visio annulée ❌", visio });
  } catch (err) {
    console.error("Erreur cancelVisio:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * rescheduleVisio (mentor)
 */
exports.rescheduleVisio = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) return res.status(400).json({ message: "Nouvelle date manquante" });

    const visio = await VisioSession.findOne({ where: { id, mentorId } });
    if (!visio) return res.status(404).json({ message: "Session introuvable" });

    // conflits
    if (await hasConflict({ userId: visio.femmeId, scheduledAt, excludeId: id, role: "femme" }))
      return res.status(409).json({ message: "La femme a déjà une visio à cette date" });

    if (await hasConflict({ userId: mentorId, scheduledAt, excludeId: id, role: "mentor" }))
      return res.status(409).json({ message: "Vous avez déjà une visio à cette date" });

    await visio.update({ scheduledAt, status: "planifiée" });
    res.json({ message: "Visio replanifiée 📅", visio });
  } catch (err) {
    console.error("Erreur rescheduleVisio:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};