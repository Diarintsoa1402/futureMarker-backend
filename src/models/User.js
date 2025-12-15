const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false
  },

  role: {
    type: DataTypes.ENUM("child", "woman", "mentor", "investor", "admin", "parent"),
    defaultValue: "child",
  },

  // Nouveaux champs pour OAuth
  provider: {
    type: DataTypes.ENUM("local", "google", "facebook"),
    defaultValue: "local"
  },

  providerId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

  // Nouveaux champs
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  
  parentEmail: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  
  isVerified: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  
  resetPasswordToken: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  
  resetPasswordExpire: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },

}, {
  tableName: "users"
});

module.exports = User;