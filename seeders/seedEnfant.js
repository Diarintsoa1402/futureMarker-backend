/* FICHIER: src/seeds/seedEnfant.js (script d'exemple à lancer manuellement) */
const sequelize = require("../config/database");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");

async function seed() {
await sequelize.sync();

const c1 = await Course.create({
title: "Introduction à l'entrepreneuriat",
description: "Bases pour démarrer une mini-entreprise.",
supports: [{ type: "pdf", title: "Guide", url: "/files/guide.pdf" }],
});

const q = await Quiz.create({ title: "Quiz: Entrepreneuriat 1", description: "Quiz basique" });
await Question.bulkCreate([
{ quizId: q.id, text: "Quel est le coût initial ?", choices: [{ id: "a", text: "0" }, { id: "b", text: "100" }], correct: ["a"], points: 1 },
{ quizId: q.id, text: "Vendre c'est ?", choices: [{ id: "a", text: "Donner" }, { id: "b", text: "Échanger" }], correct: ["b"], points: 1 },
]);

console.log("Seed terminé");
process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });