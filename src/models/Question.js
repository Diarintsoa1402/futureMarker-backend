/* FICHIER: src/models/Question.js */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Quiz = require("./Quiz");

const Question = sequelize.define("Question", {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
quizId: { type: DataTypes.INTEGER, allowNull: false },
text: { type: DataTypes.TEXT, allowNull: false },
// choices: [{ id: 'a', text: '...'}, ...]
choices: { type: DataTypes.JSON, allowNull: false },
// correct: array of correct choice keys (ex: ['a']) — keep minimal server-side for grading
correct: { type: DataTypes.JSON, allowNull: false },
points: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
tableName: "questions",
timestamps: false,
});

Quiz.hasMany(Question, { foreignKey: "quizId" });
Question.belongsTo(Quiz, { foreignKey: "quizId" });

module.exports = Question;