// backend/src/models/Conversation.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const User = require("../User");

const Conversation = sequelize.define("Conversation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user1Id: { type: DataTypes.INTEGER, allowNull: false },
  user2Id: { type: DataTypes.INTEGER, allowNull: false },
  lastMessage: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "conversations", timestamps: true });

User.hasMany(Conversation, { foreignKey: "user1Id", as: "convUser1" });
User.hasMany(Conversation, { foreignKey: "user2Id", as: "convUser2" });

module.exports = Conversation;
