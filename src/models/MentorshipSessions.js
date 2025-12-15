const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const MentorshipSession = sequelize.define("MentorshipSession", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  mentorId: { type: DataTypes.INTEGER, allowNull: false },
  femmeId: { type: DataTypes.INTEGER, allowNull: false },
  theme: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.ENUM("planifiée", "terminée", "annulée"),
    defaultValue: "planifiée",
  },
  notes: { type: DataTypes.TEXT, allowNull: true }, // compte rendu / remarques
}, {
  tableName: "mentorship_sessions",
  timestamps: true,
});

// Relations
User.hasMany(MentorshipSession, { as: "menteeSessions", foreignKey: "femmeId" });
User.hasMany(MentorshipSession, { as: "mentorSessions", foreignKey: "mentorId" });
MentorshipSession.belongsTo(User, { as: "femme", foreignKey: "femmeId" });
MentorshipSession.belongsTo(User, { as: "mentor", foreignKey: "mentorId" });

module.exports = MentorshipSession;
