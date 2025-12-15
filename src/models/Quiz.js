/* FICHIER: src/models/Quiz.js */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Quiz = sequelize.define("Quiz", {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
title: { type: DataTypes.STRING, allowNull: false },
description: { type: DataTypes.TEXT },
// questions stored separately in Question model
createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
tableName: "quizzes",
});

module.exports = Quiz;