// backend/src/controllers/chatController.js
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { Conversation, Message, Group, GroupMember, User } = require("../models");

// === Helper de validation ===
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
};

//
// =============================
// 🔹 CONVERSATIONS PRIVÉES
// =============================
exports.getOrCreateConversation = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const userId = req.user.id;
    const { otherUserId } = req.body;

    if (userId === otherUserId)
      return res.status(400).json({ message: "Impossible de discuter avec soi-même" });

    const otherUser = await User.findByPk(otherUserId);
    if (!otherUser) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Cherche une conversation existante dans les deux sens
    let conv = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId },
        ],
      },
    });

    if (!conv) {
      conv = await Conversation.create({ user1Id: userId, user2Id: otherUserId });
    }

    const other =
      conv.user1Id === userId
        ? await User.findByPk(conv.user2Id, {
            attributes: ["id", "name", "email", "avatarUrl"],
          })
        : await User.findByPk(conv.user1Id, {
            attributes: ["id", "name", "email", "avatarUrl"],
          });

    res.json({
      id: conv.id,
      otherUser: other,
      lastMessage: conv.lastMessage || null,
      updatedAt: conv.updatedAt,
    });
  } catch (err) {
    console.error("❌ getOrCreateConversation:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Liste toutes les conversations
exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const convs = await Conversation.findAll({
      where: { [Op.or]: [{ user1Id: userId }, { user2Id: userId }] },
      order: [["updatedAt", "DESC"]],
    });

    const data = await Promise.all(
      convs.map(async (c) => {
        const otherId = c.user1Id === userId ? c.user2Id : c.user1Id;
        const other = await User.findByPk(otherId, {
          attributes: ["id", "name", "email", "avatarUrl"],
        });

        const unreadCount = await Message.count({
          where: {
            conversationId: c.id,
            senderId: otherId,
            read: false,
          },
        });

        return {
          id: c.id,
          otherUser: other,
          lastMessage: c.lastMessage || null,
          lastMessageAt: c.lastMessageAt,
          unreadCount,
          updatedAt: c.updatedAt,
        };
      })
    );

    res.json(data);
  } catch (err) {
    console.error("❌ listConversations:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Messages d'une conversation
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conv = await Conversation.findByPk(id);
    if (!conv)
      return res.status(404).json({ message: "Conversation introuvable" });

    if (![conv.user1Id, conv.user2Id].includes(userId))
      return res.status(403).json({ message: "Accès non autorisé" });

    const messages = await Message.findAll({
      where: { conversationId: id },
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "avatarUrl"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json(messages);
  } catch (err) {
    console.error("❌ getMessages:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Marquer conversation comme lue
exports.markConversationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await Message.update(
      { read: true },
      {
        where: {
          conversationId: id,
          senderId: { [Op.ne]: userId },
          read: false,
        },
      }
    );

    res.json({ message: "Messages marqués comme lus" });
  } catch (err) {
    console.error("❌ markConversationAsRead:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Envoyer un message
exports.postMessage = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const userId = req.user.id;
    const { conversationId, groupId, content, fileUrl } = req.body;

    if (!content && !fileUrl)
      return res.status(400).json({ message: "Message vide" });

    const msg = await Message.create({
      conversationId: conversationId || null,
      groupId: groupId || null,
      senderId: userId,
      content,
      fileUrl,
      read: false,
    });

    if (conversationId) {
      await Conversation.update(
        {
          lastMessage: content || "📎 Fichier",
          lastMessageAt: new Date(),
        },
        { where: { id: conversationId } }
      );
    }

    const fullMsg = await Message.findByPk(msg.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "name", "avatarUrl"] }],
    });

    res.status(201).json(fullMsg);
  } catch (err) {
    console.error("❌ postMessage:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

//
// =============================
// 🔹 GROUPES
// =============================
exports.createGroup = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const userId = req.user.id;
    const { name, description, memberIds = [] } = req.body;

    const group = await Group.create({ name, description, createdBy: userId });

    await GroupMember.create({ groupId: group.id, userId, role: "admin" });

    const members = [...new Set(memberIds)].filter((id) => id !== userId);
    await Promise.all(
      members.map((id) =>
        GroupMember.create({ groupId: group.id, userId: id, role: "member" })
      )
    );

    const fullGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "name", "email", "avatarUrl"],
          through: { attributes: ["role"] },
        },
      ],
    });

    res.status(201).json(fullGroup);
  } catch (err) {
    console.error("❌ createGroup:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Liste des groupes
exports.listGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.findAll({
      include: [
        {
          model: User,
          as: "users",
          where: { id: userId },
          attributes: ["id", "name", "email"],
          through: { attributes: ["role"] },
        },
      ],
    });

    const formatted = groups.map((g) => {
      const role = g.users[0].GroupMember.role;
      return { ...g.toJSON(), userRole: role };
    });

    res.json(formatted);
  } catch (err) {
    console.error("❌ listGroups:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Détails groupe
exports.getGroupDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const membership = await GroupMember.findOne({ where: { groupId: id, userId } });
    if (!membership) return res.status(403).json({ message: "Accès interdit" });

    const group = await Group.findByPk(id, {
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "name", "email", "avatarUrl"],
          through: { attributes: ["role"] },
        },
      ],
    });

    res.json({ ...group.toJSON(), userRole: membership.role });
  } catch (err) {
    console.error("❌ getGroupDetails:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Messages d'un groupe
exports.getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await GroupMember.findOne({ where: { groupId: id, userId } });
    if (!member) return res.status(403).json({ message: "Accès interdit" });

    const messages = await Message.findAll({
      where: { groupId: id },
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "avatarUrl"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json(messages);
  } catch (err) {
    console.error("❌ getGroupMessages:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Ajouter membre
exports.addGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: newUserId } = req.body;
    const currentUser = req.user.id;

    const admin = await GroupMember.findOne({ where: { groupId: id, userId: currentUser } });
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ message: "Seuls les admins peuvent ajouter" });

    const exists = await GroupMember.findOne({ where: { groupId: id, userId: newUserId } });
    if (exists) return res.status(400).json({ message: "Déjà membre" });

    await GroupMember.create({ groupId: id, userId: newUserId, role: "member" });
    res.json({ message: "Membre ajouté" });
  } catch (err) {
    console.error("❌ addGroupMember:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Retirer membre
exports.removeGroupMember = async (req, res) => {
  try {
    const { id, userId: targetUser } = req.params;
    const currentUser = req.user.id;

    const admin = await GroupMember.findOne({ where: { groupId: id, userId: currentUser } });
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ message: "Seuls les admins peuvent retirer" });

    const group = await Group.findByPk(id);
    if (parseInt(targetUser) === group.createdBy)
      return res.status(400).json({ message: "Impossible de retirer le créateur" });

    await GroupMember.destroy({ where: { groupId: id, userId: targetUser } });
    res.json({ message: "Membre retiré" });
  } catch (err) {
    console.error("❌ removeGroupMember:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Modifier groupe
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    const member = await GroupMember.findOne({ where: { groupId: id, userId } });
    if (!member || member.role !== "admin")
      return res.status(403).json({ message: "Non autorisé" });

    await Group.update({ name, description }, { where: { id } });
    const updated = await Group.findByPk(id);
    res.json(updated);
  } catch (err) {
    console.error("❌ updateGroup:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Supprimer groupe
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findByPk(id);
    if (!group) return res.status(404).json({ message: "Groupe introuvable" });
    if (group.createdBy !== userId)
      return res.status(403).json({ message: "Seul le créateur peut supprimer" });

    await GroupMember.destroy({ where: { groupId: id } });
    await Message.destroy({ where: { groupId: id } });
    await group.destroy();

    res.json({ message: "Groupe supprimé" });
  } catch (err) {
    console.error("❌ deleteGroup:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
