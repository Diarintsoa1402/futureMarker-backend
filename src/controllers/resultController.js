// src/controllers/resultController.js
const Result = require("../models/Result");
const Quiz = require("../models/Quiz");
const Course = require("../models/Course");

exports.getMyResults = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Non autorisé" 
      });
    }

    const { page = 1, limit = 20, quizId, courseId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId };
    if (quizId) whereClause.quizId = quizId;

    const { count, rows: results } = await Result.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Quiz,
          attributes: ["id", "title", "courseId"],
          include: courseId ? [{
            model: Course,
            attributes: ["id", "title"],
            where: { id: courseId }
          }] : [{
            model: Course,
            attributes: ["id", "title"]
          }]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculer les statistiques
    const stats = {
      totalAttempts: count,
      averageScore: results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0,
      bestScore: results.length > 0 
        ? Math.max(...results.map(r => r.score))
        : 0
    };

    res.json({
      success: true,
      data: results,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      },
      stats
    });

  } catch (err) {
    console.error("Erreur getMyResults:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération des résultats" 
    });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await Result.findOne({
      where: { id, userId },
      include: [{
        model: Quiz,
        attributes: ["id", "title", "questions"],
        include: [{
          model: Course,
          attributes: ["id", "title"]
        }]
      }]
    });

    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: "Résultat non trouvé" 
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("Erreur getResultById:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur" 
    });
  }
};