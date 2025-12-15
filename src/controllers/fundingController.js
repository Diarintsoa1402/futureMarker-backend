// src/controllers/fundingController.js
const Funding = require("../models/Funding");
const Project = require("../models/Project");
const User = require("../models/User");
// 💼 FEMME : soumettre une demande de financement
exports.submitFundingRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, amount } = req.body;

    // Cast et validation stricte
    const projectIdNum = parseInt(projectId, 10);
    const amountNum = parseFloat(amount);
    if (!Number.isInteger(projectIdNum) || projectIdNum <= 0) {
      return res.status(400).json({ message: "Projet invalide" });
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Le montant doit être un nombre positif" });
    }

    // Vérifie que le projet appartient bien à cette femme
    const project = await Project.findOne({ where: { id: projectIdNum, userId } });
    if (!project)
      return res.status(404).json({ message: "Projet introuvable ou non autorisé" });

    // Vérifie qu’aucune demande n’existe déjà pour ce projet
    const existing = await Funding.findOne({ where: { projectId: projectIdNum } });
    if (existing)
      return res.status(400).json({ message: "Une demande existe déjà pour ce projet" });

    const funding = await Funding.create({
      projectId: projectIdNum,
      amount: amountNum,
      investorId: null,
      status: "en attente",
    });

    res.status(201).json({ message: "Demande envoyée avec succès ✅", data: funding });
  } catch (err) {
    console.error("Erreur création financement:", err);
    res.status(500).json({ message: "Erreur lors de la soumission" });
  }
};

// 💰 INVESTISSEUR : consulter toutes les demandes
exports.getAllFundingRequests = async (req, res) => {
  try {
    const requests = await Funding.findAll({
      include: [
        {
          model: Project,
          attributes: ["id", "title", "description", "fundingRequested", "status"],
        },
        { association: "investor", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ data: requests });
  } catch (err) {
    console.error("Erreur getAllFundingRequests:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 💰 INVESTISSEUR : accepter ou refuser une demande
exports.reviewFunding = async (req, res) => {
  try {
    const investorId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepté", "refusé"].includes(status))
      return res.status(400).json({ message: "Statut invalide" });

    const funding = await Funding.findByPk(id);
    if (!funding) return res.status(404).json({ message: "Demande introuvable" });

    await funding.update({ status, investorId });

    if (status === "accepté") {
      const project = await Project.findByPk(funding.projectId);
      if (project) {
        await project.update({
          status: "financé",
          fundingReceived: funding.amount,
        });
      }
    }

    res.json({ message: `Projet ${status} avec succès`, data: funding });
  } catch (err) {
    console.error("Erreur reviewFunding:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
// 💰 INVESTISSEUR : suivre projets financés
exports.getFundedProjects = async (req, res) => {
  try {
    const investorId = req.user.id;

    const fundings = await Funding.findAll({
      where: { investorId, status: "accepté" },
      include: [
        {
          model: Project,
          include: [{ model: User, attributes: ["id", "name", "email"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (fundings.length === 0)
      return res.json({ message: "Aucun projet financé pour le moment." });

    res.json({ data: fundings });
  } catch (err) {
    console.error("Erreur getFundedProjects:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};