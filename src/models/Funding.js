// src/models/Funding.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Project = require("./Project");
const User = require("./User");

const Funding = sequelize.define("Funding", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  investorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: User, key: "id" },
    onDelete: "CASCADE",
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Project, key: "id" },
    onDelete: "CASCADE",
  },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  status: {
    type: DataTypes.ENUM("en attente", "accepté", "refusé"),
    defaultValue: "en attente",
  },
}, {
  tableName: "fundings",
  timestamps: true,
});

User.hasMany(Funding, { foreignKey: "investorId" });
Funding.belongsTo(User, { as: "investor", foreignKey: "investorId" });

Project.hasMany(Funding, { foreignKey: "projectId" });
Funding.belongsTo(Project, { foreignKey: "projectId" });

module.exports = Funding;
