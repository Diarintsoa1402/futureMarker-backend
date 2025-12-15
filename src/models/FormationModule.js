// backend/src/models/FormationModule.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FormationModule = sequelize.define("FormationModule", {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  contentType: {
    type: DataTypes.ENUM("video", "document", "quiz", "exercise", "live"),
    defaultValue: "document"
  },
  contentUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // en minutes
    allowNull: true
  },
  isOptional: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: "formation_modules",
  timestamps: true
});

module.exports = FormationModule;
