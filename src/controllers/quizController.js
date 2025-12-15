// ============================================
// backend/src/controllers/quizController.js
// ============================================
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Result = require("../models/Result");

/**
 * Récupère un quiz avec ses questions
 */
exports.getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID du quiz invalide" });
    }

    const quiz = await Quiz.findByPk(id, { 
      include: [{ 
        model: Question,
        order: [['createdAt', 'ASC']]
      }] 
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz non trouvé" });
    }

    // Parse les choices et masque les réponses correctes
    const quizData = quiz.toJSON();
    if (quizData.Questions) {
      quizData.Questions = quizData.Questions.map(q => {
        try {
          q.choices = typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices;
          delete q.correct; // Ne pas envoyer les réponses au client
        } catch (err) {
          console.error("Erreur parsing choices:", err);
          q.choices = [];
        }
        return q;
      });
    }

    res.json(quizData);
  } catch (err) {
    console.error("Erreur récupération quiz:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Soumet les réponses d'un quiz et calcule le score
 */
exports.submitQuiz = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const quizId = req.params.id;
    const answers = req.body.answers || {};

    if (!userId) {
      return res.status(400).json({ message: "Utilisateur requis" });
    }

    if (!quizId || isNaN(quizId)) {
      return res.status(400).json({ message: "ID du quiz invalide" });
    }

    // Vérifier si l'utilisateur a déjà soumis ce quiz
    const existingResult = await Result.findOne({
      where: { userId, quizId }
    });

    if (existingResult) {
      return res.status(400).json({ 
        message: "Vous avez déjà complété ce quiz",
        alreadyCompleted: true,
        result: existingResult
      });
    }

    const questions = await Question.findAll({ where: { quizId } });
    
    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: "Questions non trouvées" });
    }

    let totalPoints = 0;
    let scoreObtained = 0;
    const detailedResults = [];

    for (const q of questions) {
      totalPoints += q.points || 1;
      
      // Parse correct answers
      let correctAnswers;
      try {
        correctAnswers = typeof q.correct === "string" ? JSON.parse(q.correct) : q.correct;
        correctAnswers = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
      } catch (err) {
        console.error("Erreur parsing correct:", err);
        continue;
      }

      const givenAnswers = answers[q.id] || [];
      const givenArray = Array.isArray(givenAnswers) ? givenAnswers : [givenAnswers];

      // Vérification stricte: même longueur et tous les éléments présents
      const isCorrect = 
        givenArray.length === correctAnswers.length && 
        correctAnswers.every(c => givenArray.includes(c)) &&
        givenArray.every(g => correctAnswers.includes(g));

      if (isCorrect) {
        scoreObtained += q.points || 1;
      }

      detailedResults.push({
        questionId: q.id,
        isCorrect,
        points: isCorrect ? (q.points || 1) : 0
      });
    }

    // Calcul du pourcentage et attribution du badge
    const percentage = totalPoints === 0 ? 0 : Math.round((scoreObtained / totalPoints) * 100);
    let badge = null;
    
    if (percentage >= 90) badge = "gold";
    else if (percentage >= 70) badge = "silver";
    else if (percentage >= 50) badge = "bronze";

    // Créer ou mettre à jour le résultat
    let result;
    if (existingResult) {
      // Mettre à jour uniquement si le nouveau score est meilleur
      if (scoreObtained > existingResult.score) {
        existingResult.score = scoreObtained;
        existingResult.maxScore = totalPoints;
        existingResult.badge = badge;
        await existingResult.save();
        result = existingResult;
      } else {
        result = existingResult;
      }
    } else {
      result = await Result.create({ 
        userId, 
        quizId, 
        score: scoreObtained, 
        maxScore: totalPoints, 
        badge 
      });
    }

    res.json({ 
      result, 
      percentage,
      success: percentage >= 50, 
      badge,
      detailedResults
    });

  } catch (err) {
    console.error("Erreur soumission quiz:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Récupère tous les quiz disponibles
 */
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      attributes: ['id', 'title', 'description', 'createdAt'],
      include: [{
        model: Question,
        attributes: ['id']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Ajouter le nombre de questions
    const quizzesWithCount = quizzes.map(quiz => {
      const quizData = quiz.toJSON();
      quizData.questionCount = quizData.Questions?.length || 0;
      delete quizData.Questions;
      return quizData;
    });

    res.json(quizzesWithCount);
  } catch (err) {
    console.error("Erreur récupération quiz:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Récupère les résultats de l'utilisateur
 */
exports.getMyResults = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const results = await Result.findAll({
      where: { userId },
      include: [{
        model: Quiz,
        attributes: ['id', 'title']
      }],
      order: [["createdAt", "DESC"]],
    });

    res.json(results);
  } catch (err) {
    console.error("Erreur récupération résultats:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Récupère les statistiques globales de l'utilisateur
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const results = await Result.findAll({
      where: { userId }
    });

    const stats = {
      totalQuizzes: results.length,
      averageScore: 0,
      badges: {
        gold: 0,
        silver: 0,
        bronze: 0
      }
    };

    if (results.length > 0) {
      const totalPercentage = results.reduce((sum, r) => {
        const percent = r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0;
        return sum + percent;
      }, 0);
      
      stats.averageScore = Math.round(totalPercentage / results.length);

      results.forEach(r => {
        if (r.badge) {
          stats.badges[r.badge] = (stats.badges[r.badge] || 0) + 1;
        }
      });
    }

    res.json(stats);
  } catch (err) {
    console.error("Erreur récupération statistiques:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
