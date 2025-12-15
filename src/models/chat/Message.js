// backend/src/models/Message.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const Conversation = require("./Conversation");

const Message = sequelize.define("Message", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conversationId: { type: DataTypes.INTEGER, allowNull: true },
  groupId: { type: DataTypes.INTEGER, allowNull: true },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: true },
  fileUrl: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM("envoyé", "livré", "vu"), defaultValue: "envoyé" },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },

}, { tableName: "messages", timestamps: true });

Conversation.hasMany(Message, { foreignKey: "conversationId" });
Message.belongsTo(Conversation, { foreignKey: "conversationId" });

module.exports = Message;
