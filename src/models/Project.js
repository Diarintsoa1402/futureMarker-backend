// src/models/Project.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Project = sequelize.define("Project", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: "id" },
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM("en cours", "terminé", "financé", "refusé"),
    defaultValue: "en cours",
  },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
  fundingRequested: { type: DataTypes.FLOAT, defaultValue: 0 },
  fundingReceived: { type: DataTypes.FLOAT, defaultValue: 0 },
}, {
  tableName: "projects",
  timestamps: true,
});

User.hasMany(Project, { foreignKey: "userId", onDelete: "CASCADE" });
Project.belongsTo(User, { foreignKey: "userId" });

module.exports = Project;
