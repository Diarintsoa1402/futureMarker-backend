const MentorshipRequest = require("../models/Mentorship");
const User = require("../models/User");

// 👩 Femme : envoyer une demande avec choix du mentor
exports.requestMentor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, mentorId } = req.body;

    // Validation : vérifier si le mentor existe et est bien un mentor
    const mentor = await User.findOne({ 
      where: { 
        id: mentorId, 
        role: "mentor" 
      } 
    });
    
    if (!mentor) {
      return res.status(400).json({ message: "Mentor non trouvé ou invalide." });
    }

    const existing = await MentorshipRequest.findOne({ 
      where: { 
        userId, 
        status: "en attente" 
      } 
    });
    
    if (existing) {
      return res.status(400).json({ message: "Vous avez déjà une demande en attente." });
    }

    const request = await MentorshipRequest.create({ 
      userId, 
      mentorId, 
      message 
    });
    
    res.status(201).json({ message: "Demande envoyée ✅", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 👩 Femme : obtenir la liste des mentors disponibles
exports.getAvailableMentors = async (req, res) => {
  try {
    const mentors = await User.findAll({
      where: {
        role: "mentor",
      },
      attributes: ["id", "name", "email"],
      order: [["name", "ASC"]],
    });

    res.json(mentors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🧑‍🏫 Mentor : consulter les demandes (inchangé)
exports.getRequests = async (req, res) => {
  try {
    const requests = await MentorshipRequest.findAll({
      include: [
        { 
          as: "femme", 
          model: User, 
          attributes: ["id", "name", "email"] 
        }
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🧑‍🏫 Mentor : accepter ou refuser (inchangé)
exports.reviewRequest = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const request = await MentorshipRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: "Demande introuvable" });

    await request.update({ status, mentorId });
    res.json({ message: `Demande ${status} avec succès`, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};