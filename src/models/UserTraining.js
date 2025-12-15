// src/models/UserTraining.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Training = require("./Training");

const UserTraining = sequelize.define("UserTraining", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0-100%
  status: { 
    type: DataTypes.ENUM('en_cours', 'terminé', 'abandonné'), 
    defaultValue: 'en_cours' 
  },
  completedModules: { type: DataTypes.JSON, defaultValue: [] },
  startedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
  lastActivity: { type: DataTypes.DATE }
});

User.hasMany(UserTraining, { foreignKey: "userId" });
UserTraining.belongsTo(User, { foreignKey: "userId" });

Training.hasMany(UserTraining, { foreignKey: "trainingId" });
UserTraining.belongsTo(Training, { foreignKey: "trainingId" });

module.exports = UserTraining;