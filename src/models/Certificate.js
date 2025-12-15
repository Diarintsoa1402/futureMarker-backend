// src/models/Certificate.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Training = require("./Training");

const Certificate = sequelize.define("Certificate", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  certificateNumber: { type: DataTypes.STRING, unique: true },
  issuedAt: { type: DataTypes.DATE },
  pdfUrl: { type: DataTypes.STRING }
});

User.hasMany(Certificate, { foreignKey: "userId" });
Certificate.belongsTo(User, { foreignKey: "userId" });

Training.hasMany(Certificate, { foreignKey: "trainingId" });
Certificate.belongsTo(Training, { foreignKey: "trainingId" });

module.exports = Certificate;