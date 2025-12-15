// backend/src/models/Formation.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Formation = sequelize.define("Formation", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM(
      "entrepreneuriat",
      "marketing",
      "finance",
      "leadership",
      "technologie",
      "autre"
    ),
    defaultValue: "entrepreneuriat"
  },
  level: {
    type: DataTypes.ENUM("débutant", "intermédiaire", "avancé"),
    defaultValue: "débutant"
  },
  duration: {
    type: DataTypes.INTEGER, // en heures
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  objectives: {
    type: DataTypes.TEXT, // JSON string
    allowNull: true
  },
  requirements: {
    type: DataTypes.TEXT, // JSON string
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.INTEGER, // admin qui a créé
    allowNull: false
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  }
}, {
  tableName: "formations",
  timestamps: true
});

module.exports = Formation;
