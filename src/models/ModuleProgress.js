// backend/src/models/ModuleProgress.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ModuleProgress = sequelize.define("ModuleProgress", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  enrollmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "formation_enrollments",
      key: "id"
    }
  },
  moduleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "formation_modules",
      key: "id"
    }
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  timeSpent: {
    type: DataTypes.INTEGER, // en minutes
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "module_progress",
  timestamps: true
});

module.exports = ModuleProgress;
