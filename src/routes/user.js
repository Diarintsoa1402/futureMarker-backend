
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { jwtAuth } = require("../middlewares/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Storage for avatar uploads
const avatarDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    if (!ok) return cb(new Error("Type d'image non supporté"));
    cb(null, true);
  },
  limits: { fileSize: (process.env.MAX_AVATAR_SIZE_MB ? parseInt(process.env.MAX_AVATAR_SIZE_MB, 10) : 10) * 1024 * 1024 }
});

// ✅ Récupérer tous les utilisateurs (admin uniquement)
router.get("/", jwtAuth, userController.getAllUsers);

// ✅ Récupérer un utilisateur par ID
router.get("/:id", jwtAuth, userController.getUserById);

// ✅ Mettre à jour un utilisateur
router.put("/:id", jwtAuth, userController.updateUser);

// ✅ Supprimer un utilisateur
router.delete("/:id", jwtAuth, userController.deleteUser);

// ✅ Récupérer mon profil (shortcut)
router.get("/me/profile", jwtAuth, async (req, res) => {
  try {
    const u = await require("../models/User").findByPk(req.user.id, { attributes: { exclude: ["password"] } });
    if (!u) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(u);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ✅ Mettre à jour mon avatar via URL ou upload local
router.put("/me/avatar", jwtAuth, (req, res, next) => {
  // wrapper pour capter proprement les erreurs multer
  upload.single("avatar")(req, res, function (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: "Fichier trop volumineux. Taille max autorisée dépassée." });
    }
    if (err) {
      return res.status(400).json({ message: err.message || "Erreur d'upload" });
    }
    next();
  });
}, async (req, res) => {
  try {
    const User = require("../models/User");
    const u = await User.findByPk(req.user.id);
    if (!u) return res.status(404).json({ message: "Utilisateur non trouvé" });

    const { avatarUrl } = req.body;
    if (req.file) {
      // fichier local enregistré
      u.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    } else if (avatarUrl) {
      // URL directe
      u.avatarUrl = avatarUrl;
    } else {
      return res.status(400).json({ message: "Aucun avatar fourni" });
    }

    await u.save();
    const safe = await User.findByPk(u.id, { attributes: { exclude: ["password"] } });
    res.json({ user: safe });
  } catch (err) {
    console.error("Avatar update error:", err);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'avatar" });
  }
});

module.exports = router;