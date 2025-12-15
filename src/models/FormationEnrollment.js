// backend/src/models/FormationEnrollment.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FormationEnrollment = sequelize.define("FormationEnrollment", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  formationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "formations",
      key: "id"
    }
  },
  womanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "users",
      key: "id"
    }
  },
  status: {
    type: DataTypes.ENUM("inscrite", "en_cours", "terminée", "abandonnée"),
    defaultValue: "inscrite"
  },
  progress: {
    type: DataTypes.FLOAT, // 0-100%
    defaultValue: 0
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  certificateUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  certificateIssuedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: "formation_enrollments",
  timestamps: true
});

module.exports = FormationEnrollment;
