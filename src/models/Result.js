/* FICHIER: src/models/Result.js */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Quiz = require("./Quiz");

const Result = sequelize.define("Result", {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
userId: { type: DataTypes.INTEGER, allowNull: false },
quizId: { type: DataTypes.INTEGER, allowNull: false },
score: { type: DataTypes.INTEGER, defaultValue: 0 },
maxScore: { type: DataTypes.INTEGER, defaultValue: 0 },
badge: { type: DataTypes.STRING, allowNull: true }, // exemple: "bronze","silver","gold"
createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
tableName: "results",
});

User.hasMany(Result, { foreignKey: "userId" });
Result.belongsTo(User, { foreignKey: "userId" });
Quiz.hasMany(Result, { foreignKey: "quizId" });
Result.belongsTo(Quiz, { foreignKey: "quizId" });

module.exports = Result;