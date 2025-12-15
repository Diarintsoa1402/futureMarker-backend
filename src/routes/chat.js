// backend/src/routes/chat.js
const express = require("express");
const router = express.Router();
const { jwtAuth } = require("../middlewares/auth");
const controller = require("../controllers/chatController");
const { body } = require('express-validator');
const  User  = require("../models/User");
// Validation middleware
const validateConversation = [
  body('otherUserId').isInt().withMessage('otherUserId doit être un entier'),
];

const validateMessage = [
  body('content').optional().isString().trim().notEmpty(),
  body('fileUrl').optional().isURL(),
];

const validateGroup = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Le nom du groupe est requis'),
  body('description').optional().isString(),
  body('memberIds').optional().isArray(),
];

// Conversations privées
router.post("/conversations", jwtAuth, validateConversation, controller.getOrCreateConversation);
router.get("/conversations", jwtAuth, controller.listConversations);
router.get("/conversations/:id/messages", jwtAuth, controller.getMessages);
router.put("/conversations/:id/read", jwtAuth, controller.markConversationAsRead);
router.post("/messages", jwtAuth, validateMessage, controller.postMessage);

// Groupes
router.post("/groups", jwtAuth, validateGroup, controller.createGroup);
router.get("/groups", jwtAuth, controller.listGroups);
router.get("/groups/:id", jwtAuth, controller.getGroupDetails);
router.get("/groups/:id/messages", jwtAuth, controller.getGroupMessages);
router.post("/groups/:id/members", jwtAuth, controller.addGroupMember);
router.delete("/groups/:id/members/:userId", jwtAuth, controller.removeGroupMember);
router.put("/groups/:id", jwtAuth, controller.updateGroup);
router.delete("/groups/:id", jwtAuth, controller.deleteGroup);


// Liste des utilisateurs (pour démarrer une conversation)
router.get("/users", jwtAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { id: { [require("sequelize").Op.ne]: req.user.id } }, // exclure soi-même
      attributes: ["id", "name", "email", "avatarUrl"]
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du chargement des utilisateurs" });
  }
});


module.exports = router;