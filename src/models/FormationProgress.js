// src/models/FormationProgress.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Formation = require("./Formation");

const FormationProgress = sequelize.define("FormationProgress", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  formationId: { type: DataTypes.INTEGER, allowNull: false },
  completedModules: { 
    type: DataTypes.JSON, 
    defaultValue: [] 
    // [moduleId1, moduleId2, ...]
  },
  currentModule: { type: DataTypes.INTEGER, defaultValue: 0 },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 }, // Pourcentage
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  certificateIssued: { type: DataTypes.BOOLEAN, defaultValue: false },
  certificateUrl: { type: DataTypes.STRING, allowNull: true },
  quizScores: { 
    type: DataTypes.JSON, 
    defaultValue: [] 
    // [{moduleId, score, maxScore}]
  }
});

// Relations
User.hasMany(FormationProgress, { foreignKey: "userId" });
FormationProgress.belongsTo(User, { foreignKey: "userId" });

Formation.hasMany(FormationProgress, { foreignKey: "formationId" });
FormationProgress.belongsTo(Formation, { foreignKey: "formationId" });

module.exports = FormationProgress;
