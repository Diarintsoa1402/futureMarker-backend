// controllers/userController.js
const User = require("../models/User");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] } // Exclure le mot de passe
    });
    res.json(users);
  } catch (err) {
    console.error("❌ Erreur récupération utilisateurs:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des utilisateurs",
      details: err.message 
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    console.error("❌ Erreur récupération utilisateur:", err);
    res.status(500).json({ 
      error: "Erreur lors de la récupération de l'utilisateur",
      details: err.message 
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    
    await user.update(req.body);
    
    // Retourner l'utilisateur sans le mot de passe
    const userWithoutPassword = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("❌ Erreur mise à jour utilisateur:", err);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour de l'utilisateur",
      details: err.message 
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    
    await user.destroy();
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    console.error("❌ Erreur suppression utilisateur:", err);
    res.status(500).json({ 
      error: "Erreur lors de la suppression de l'utilisateur",
      details: err.message 
    });
  }
};