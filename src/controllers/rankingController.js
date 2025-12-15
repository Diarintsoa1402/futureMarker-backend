/* FICHIER: src/controllers/rankingController.js */
const ResultModel = require("../models/Result");
const ProgressModel = require("../models/Progress");
const UserModel = require("../models/User");
const { Op } = require("sequelize");

exports.getRanking = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // === Étape 1: Récupération des scores ===
    const userScores = await ResultModel.findAll({
      attributes: [
        'userId',
        [ResultModel.sequelize.fn('SUM', ResultModel.sequelize.col('score')), 'totalScore'],
        [ResultModel.sequelize.fn('COUNT', ResultModel.sequelize.col('id')), 'attemptCount']
      ],
      group: ['userId'],
      raw: true
    });

    // === Étape 2: Récupération des cours terminés ===
    const userCompletions = await ProgressModel.findAll({
      attributes: [
        'userId',
        [ProgressModel.sequelize.fn('COUNT', ProgressModel.sequelize.col('id')), 'completedCourses']
      ],
      where: { status: "completed" },
      group: ['userId'],
      raw: true
    });

    // === Étape 3: Optimisation avec Map ===
    const scoresMap = new Map(
      userScores.map(s => [s.userId, {
        totalScore: parseInt(s.totalScore) || 0,
        attemptCount: parseInt(s.attemptCount) || 0
      }])
    );

    const completionsMap = new Map(
      userCompletions.map(c => [c.userId, parseInt(c.completedCourses) || 0])
    );

    // === Étape 4: Récupération uniquement des ENFANTS actifs ===
    const users = await UserModel.findAll({
      attributes: ["id", "name", "role", "email", "avatarUrl"],
      where: {
        isActive: true,
        role: "child"
      }
    });

    // === Étape 5: Construction du classement ===
    const ranking = users.map(user => {
      const scoreData = scoresMap.get(user.id) || { totalScore: 0, attemptCount: 0 };
      const completions = completionsMap.get(user.id) || 0;

      const totalScore = scoreData.totalScore + (completions * 10);

      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        avatarUrl: user.avatarUrl,
        quizScore: scoreData.totalScore,
        completedCourses: completions,
        attemptCount: scoreData.attemptCount,
        totalScore,
        averageScore: scoreData.attemptCount > 0 
          ? Math.round(scoreData.totalScore / scoreData.attemptCount)
          : 0
      };
    });

    // === Étape 6: Tri du classement ===
    ranking.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.completedCourses !== a.completedCourses) return b.completedCourses - a.completedCourses;
      return b.averageScore - a.averageScore;
    });

    // === Étape 7: Ajout du rang et limite ===
    const rankedData = ranking.slice(0, parseInt(limit)).map((user, index) => ({
      ...user,
      rank: index + 1,
      isCurrentUser: user.userId === req.user?.id
    }));

    res.json({
      success: true,
      data: rankedData,
      meta: {
        total: rankedData.length,
        limit: parseInt(limit),
        filteredBy: "child"
      }
    });

  } catch (err) {
    console.error("Erreur getRanking:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération du classement"
    });
  }
};


exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Non autorisé"
      });
    }

    // Recalcul du classement uniquement pour les enfants
    const allResults = await ResultModel.findAll({
      attributes: [
        'userId',
        [ResultModel.sequelize.fn('SUM', ResultModel.sequelize.col('score')), 'totalScore']
      ],
      group: ['userId'],
      raw: true
    });

    const progress = await ProgressModel.findAll({
      attributes: [
        'userId',
        [ProgressModel.sequelize.fn('COUNT', ProgressModel.sequelize.col('id')), 'completedCourses']
      ],
      where: { status: "completed" },
      group: ['userId'],
      raw: true
    });

    // Récupérer uniquement les enfants actifs
    const children = await UserModel.findAll({
      attributes: ['id'],
      where: { role: "child", isActive: true },
      raw: true
    });
    const childIds = children.map(c => c.id);

    const scoresMap = new Map(allResults.map(r => [r.userId, parseInt(r.totalScore) || 0]));
    const completionsMap = new Map(progress.map(p => [p.userId, parseInt(p.completedCourses) || 0]));

    // Calculer les scores finaux uniquement pour les enfants
    const ranking = childIds.map(uid => ({
      userId: uid,
      totalScore: (scoresMap.get(uid) || 0) + ((completionsMap.get(uid) || 0) * 10)
    }));

    // Trier et trouver le rang du user courant
    ranking.sort((a, b) => b.totalScore - a.totalScore);
    const rank = ranking.findIndex(r => r.userId === userId) + 1;
    const myScore = ranking.find(r => r.userId === userId)?.totalScore || 0;

    res.json({
      success: true,
      data: {
        userId,
        rank,
        totalScore: myScore
      }
    });

  } catch (err) {
    console.error("Erreur getUserRank:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération du rang utilisateur"
    });
  }
};
