const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const Group = sequelize.define("Group", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
}, { 
  tableName: "groups", 
  timestamps: true 
});

Group.associate = function(models) {
  // Lien N:N via GroupMember
  Group.belongsToMany(models.User, { 
    through: models.GroupMember,
    foreignKey: 'groupId',
    as: 'users'
  });
  
  Group.hasMany(models.GroupMember, { foreignKey: 'groupId' });
};

module.exports = Group;
