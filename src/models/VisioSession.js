const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const VisioSession = sequelize.define("VisioSession", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  mentorId: { type: DataTypes.INTEGER, allowNull: false },
  femmeId: { type: DataTypes.INTEGER, allowNull: false },
  link: { type: DataTypes.STRING, allowNull: false },
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.STRING,
    defaultValue: "planifiée", // planifiée | en cours | terminée | annulée
  },
  cancelReason: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
});

// Relations
User.hasMany(VisioSession, { foreignKey: "mentorId", as: "visioMentor" });
User.hasMany(VisioSession, { foreignKey: "femmeId", as: "visioFemme" });
VisioSession.belongsTo(User, { foreignKey: "mentorId", as: "mentor" });
VisioSession.belongsTo(User, { foreignKey: "femmeId", as: "femme" });

module.exports = VisioSession;