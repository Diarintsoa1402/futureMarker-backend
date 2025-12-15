/* FICHIER: src/models/Progress.js - VERSION AMELIOREE */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Course = require("./Course");

const Progress = sequelize.define("Progress", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM("not_started", "in_progress", "completed"), defaultValue: "not_started" },
  percent: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0-100
  completedSupports: { 
    type: DataTypes.JSON, 
    defaultValue: [] // Stocke les indices des supports complétés
  },
  timeSpent: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 // Temps passé en minutes
  },
  lastAccessedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  completedAt: { 
    type: DataTypes.DATE, 
    allowNull: true 
  }
}, {
  tableName: "progresses",
  timestamps: false,
});

User.hasMany(Progress, { foreignKey: "userId" });
Progress.belongsTo(User, { foreignKey: "userId" });
Course.hasMany(Progress, { foreignKey: "courseId" });
Progress.belongsTo(Course, { foreignKey: "courseId" });

module.exports = Progress;