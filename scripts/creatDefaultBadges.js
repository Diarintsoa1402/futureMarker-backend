// scripts/createDefaultBadges.js
const Badge = require("../models/Badge");

const defaultBadges = [
  {
    name: "Premier Pas",
    description: "Réussir votre premier quiz",
    conditionType: "quiz_passed",
    conditionValue: 1,
    icon: "👣"
  },
  {
    name: "Quiz Master",
    description: "Réussir 3 quiz",
    conditionType: "quiz_passed", 
    conditionValue: 3,
    icon: "🧠"
  },
  {
    name: "Expert en Quiz",
    description: "Réussir 10 quiz",
    conditionType: "quiz_passed",
    conditionValue: 10,
    icon: "🏆"
  },
  {
    name: "Élève Assidu",
    description: "Compléter 5 cours",
    conditionType: "courses_completed",
    conditionValue: 5,
    icon: "📚"
  },
  {
    name: "Score Parfait",
    description: "Obtenir 100% à un quiz",
    conditionType: "perfect_score", 
    conditionValue: 1,
    icon: "⭐"
  },
  {
    name: "Série de 7",
    description: "7 jours d'activité consécutifs",
    conditionType: "streak",
    conditionValue: 7,
    icon: "🔥"
  }
];

async function createDefaultBadges() {
  try {
    for (const badgeData of defaultBadges) {
      await Badge.findOrCreate({
        where: { name: badgeData.name },
        defaults: badgeData
      });
    }
    console.log("✅ Badges par défaut créés avec succès");
  } catch (error) {
    console.error("❌ Erreur création badges:", error);
  }
}

module.exports = createDefaultBadges;