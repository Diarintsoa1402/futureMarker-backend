/* FICHIER: src/models/MiniEnterprise.js */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const MiniEnterprise = sequelize.define("MiniEnterprise", {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
userId: { type: DataTypes.INTEGER, allowNull: false, unique: true }, // one per child
products: { type: DataTypes.JSON, defaultValue: [] }, // [{id, name, price, stock}]
finances: { type: DataTypes.JSON, defaultValue: { capital: 0, revenue: 0, expenses: 0 } },
createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
tableName: "mini_enterprises",
});

User.hasOne(MiniEnterprise, { foreignKey: "userId" });
MiniEnterprise.belongsTo(User, { foreignKey: "userId" });

module.exports = MiniEnterprise;