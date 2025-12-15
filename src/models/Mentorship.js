const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const MentorshipRequest = sequelize.define("MentorshipRequest", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false }, // la femme
  mentorId: { type: DataTypes.INTEGER, allowNull: true }, // le mentor (assigné plus tard)
  message: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM("en attente", "accepté", "refusé"),
    defaultValue: "en attente",
  },
  
}, {
  tableName: "mentorship_requests",
  timestamps: true,
});


// Relations
User.hasMany(MentorshipRequest, { foreignKey: "userId" });
MentorshipRequest.belongsTo(User, { as: "femme", foreignKey: "userId" });

User.hasMany(MentorshipRequest, { foreignKey: "mentorId" });
MentorshipRequest.belongsTo(User, { as: "mentor", foreignKey: "mentorId" });

module.exports = MentorshipRequest;
