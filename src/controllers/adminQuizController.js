// ============================================
// backend/src/controllers/adminQuizController.js
// ============================================
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const { validationResult } = require("express-validator");

/**
 * Crée un nouveau quiz
 */
exports.createQuiz = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Le titre est requis" });
    }

    const quiz = await Quiz.create({ 
      title: title.trim(), 
      description: description?.trim() || "" 
    });
    
    res.status(201).json(quiz);
  } catch (err) {
    console.error("Erreur création quiz:", err);
    res.status(500).json({ message: "Erreur serveur lors de la création du quiz" });
  }
};

/**
 * Ajoute une question à un quiz
 */
exports.addQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { text, choices, correct, points } = req.body;

    // Validation du quiz
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }

    // Validation des données
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Le texte de la question est requis" });
    }

    if (!Array.isArray(choices) || choices.length < 2) {
      return res.status(400).json({ message: "Au moins 2 choix sont requis" });
    }

    if (!Array.isArray(correct) || correct.length === 0) {
      return res.status(400).json({ message: "Au moins une réponse correcte est requise" });
    }

    // Validation des indices de réponses correctes
    const invalidIndices = correct.filter(idx => idx < 0 || idx >= choices.length);
    if (invalidIndices.length > 0) {
      return res.status(400).json({ message: "Indices de réponses correctes invalides" });
    }

    const question = await Question.create({ 
      quizId, 
      text: text.trim(), 
      choices: JSON.stringify(choices),
      correct: JSON.stringify(correct),
      points: points || 1
    });

    res.status(201).json(question);
  } catch (err) {
    console.error("Erreur ajout question:", err);
    res.status(500).json({ message: "Erreur serveur lors de l'ajout de la question" });
  }
};

/**
 * Récupère tous les quiz avec leurs questions
 */
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({ 
      include: [{ 
        model: Question,
        order: [['createdAt', 'ASC']]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(quizzes);
  } catch (err) {
    console.error("Erreur récupération quiz:", err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des quiz" });
  }
};

/**
 * Supprime un quiz et ses questions associées
 */
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await Quiz.findByPk(id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }

    await quiz.destroy();
    res.json({ message: "Quiz supprimé avec succès" });
  } catch (err) {
    console.error("Erreur suppression quiz:", err);
    res.status(500).json({ message: "Erreur serveur lors de la suppression du quiz" });
  }
};

/**
 * Met à jour un quiz
 */
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const quiz = await Quiz.findByPk(id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz introuvable" });
    }

    if (title) quiz.title = title.trim();
    if (description !== undefined) quiz.description = description.trim();

    await quiz.save();
    res.json(quiz);
  } catch (err) {
    console.error("Erreur mise à jour quiz:", err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du quiz" });
  }
};

/**
 * Supprime une question
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question introuvable" });
    }

    await question.destroy();
    res.json({ message: "Question supprimée avec succès" });
  } catch (err) {
    console.error("Erreur suppression question:", err);
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la question" });
  }
};