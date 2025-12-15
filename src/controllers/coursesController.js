/* FICHIER: src/controllers/coursesController.js - VERSION COMPATIBLE */
const Course = require("../models/Course");
const Progress = require("../models/Progress");
const { Op } = require("sequelize");

exports.getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      category, 
      difficulty,
      sort = 'createdAt' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { isPublished: true };

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category && category !== 'all') where.category = category;
    if (difficulty && difficulty !== 'all') where.difficulty = difficulty;

    const orderBy = sort === 'popular' 
      ? [['enrollmentCount', 'DESC']] 
      : sort === 'rating'
      ? [['rating', 'DESC']]
      : sort === 'title'
      ? [['title', 'ASC']]
      : [['createdAt', 'DESC']];

    const { count, rows } = await Course.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderBy,
      attributes: { 
        exclude: ['supports'] // Optimisation des performances
      }
    });

    // Récupérer les progressions de l'utilisateur connecté
    let userProgressMap = {};
    if (req.user?.id) {
      const userProgress = await Progress.findAll({
        where: { userId: req.user.id },
        attributes: ['courseId', 'percent', 'status']
      });
      
      userProgressMap = userProgress.reduce((map, progress) => {
        map[progress.courseId] = progress;
        return map;
      }, {});
    }

    const coursesWithProgress = rows.map(course => ({
      ...course.toJSON(),
      userProgress: userProgressMap[course.id] || null
    }));

    res.json({
      success: true,
      data: {
        courses: coursesWithProgress,
        pagination: {
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          totalCourses: count,
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error('Erreur getAllCourses:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de la récupération des cours" 
    });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Cours non trouvé" 
      });
    }

    if (!course.isPublished && req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: "Ce cours n'est pas encore disponible" 
      });
    }

    // Récupérer la progression de l'utilisateur
    let userProgress = null;
    if (req.user?.id) {
      userProgress = await Progress.findOne({
        where: { 
          userId: req.user.id, 
          courseId: id 
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...course.toJSON(),
        userProgress
      }
    });
  } catch (err) {
    console.error('Erreur getCourse:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de la récupération du cours" 
    });
  }
};

exports.saveProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, status, percent, completedSupports } = req.body;

    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        message: "L'identifiant du cours est requis" 
      });
    }

    // Vérifier que le cours existe
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Cours non trouvé" 
      });
    }

    let progress = await Progress.findOne({ 
      where: { userId, courseId } 
    });

    const isNewProgress = !progress;

    // Calculer le pourcentage basé sur les supports complétés si fournis
    let finalPercent = percent;
    if (completedSupports && Array.isArray(completedSupports) && course.supports?.length > 0) {
      finalPercent = Math.round((completedSupports.length / course.supports.length) * 100);
    }

    // Déterminer le statut automatiquement si non fourni
    let finalStatus = status;
    if (!finalStatus) {
      if (finalPercent === 0) {
        finalStatus = 'not_started';
      } else if (finalPercent === 100) {
        finalStatus = 'completed';
      } else {
        finalStatus = 'in_progress';
      }
    }

    if (!progress) {
      // Nouvelle progression - incrémenter le compteur d'inscriptions
      await Course.increment('enrollmentCount', { where: { id: courseId } });
      
      progress = await Progress.create({
        userId,
        courseId,
        status: finalStatus,
        percent: finalPercent,
        updatedAt: new Date()
      });
    } else {
      await progress.update({
        status: finalStatus,
        percent: finalPercent,
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        progress,
        isNew: isNewProgress,
        course: {
          id: course.id,
          title: course.title,
          totalSupports: course.supports?.length || 0
        }
      },
      message: "Progression sauvegardée avec succès"
    });
  } catch (err) {
    console.error('Erreur saveProgress:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la sauvegarde de la progression" 
    });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "L'identifiant utilisateur est requis" 
      });
    }

    const progress = await Progress.findAll({
      where: { userId },
      include: [{
        model: Course,
        attributes: ['id', 'title', 'thumbnail', 'category', 'difficulty', 'duration', 'supports']
      }],
      order: [['updatedAt', 'DESC']]
    });

    // Enrichir avec les détails de progression calculés
    const progressWithDetails = progress.map(p => {
      const course = p.Course;
      const totalSupports = course.supports?.length || 0;
      const calculatedPercent = p.percent; // Utiliser le pourcentage stocké

      return {
        ...p.toJSON(),
        calculatedPercent,
        totalSupports,
        course: {
          ...course.toJSON(),
          supports: undefined // Exclure les supports pour réduire la taille de la réponse
        }
      };
    });

    // Statistiques globales
    const stats = {
      totalCourses: progress.length,
      completedCourses: progress.filter(p => p.status === 'completed').length,
      inProgressCourses: progress.filter(p => p.status === 'in_progress').length,
      notStartedCourses: progress.filter(p => p.status === 'not_started').length,
      averageProgress: progress.length > 0 
        ? Math.round(progress.reduce((sum, p) => sum + p.percent, 0) / progress.length)
        : 0
    };

    res.json({
      success: true,
      data: {
        progress: progressWithDetails,
        stats
      }
    });
  } catch (err) {
    console.error('Erreur getProgress:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération de la progression" 
    });
  }
};

exports.getCourseProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant du cours est requis"
      });
    }

    const progress = await Progress.findOne({
      where: { userId, courseId },
      include: [{
        model: Course,
        attributes: ['id', 'title', 'supports', 'thumbnail', 'category']
      }]
    });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          progress: null,
          message: "Aucune progression trouvée pour ce cours"
        }
      });
    }

    const course = progress.Course;
    const totalSupports = course.supports?.length || 0;

    // Préparer les détails des supports
    const supportsDetails = course.supports?.map((support, index) => ({
      ...support,
      index,
      // Pour l'instant, on ne peut pas savoir quels supports sont complétés
      // car votre modèle Progress ne stocke pas completedSupports
      isCompleted: false // À implémenter si vous ajoutez ce champ
    })) || [];

    res.json({
      success: true,
      data: {
        progress: {
          ...progress.toJSON(),
          totalSupports,
          supports: supportsDetails
        }
      }
    });
  } catch (err) {
    console.error('Erreur getCourseProgress:', err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la progression du cours"
    });
  }
};

exports.resetProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    const progress = await Progress.findOne({
      where: { userId, courseId }
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Aucune progression trouvée pour ce cours"
      });
    }

    await progress.update({
      status: 'not_started',
      percent: 0,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: "Progression réinitialisée avec succès"
    });
  } catch (err) {
    console.error('Erreur resetProgress:', err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la réinitialisation de la progression"
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Course.findAll({
      attributes: ['category'],
      where: { isPublished: true },
      group: ['category'],
      order: [['category', 'ASC']]
    });

    res.json({
      success: true,
      data: categories.map(c => c.category)
    });
  } catch (err) {
    console.error('Erreur getCategories:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération des catégories" 
    });
  }
};

exports.searchCourses = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Le terme de recherche est requis"
      });
    }

    const courses = await Course.findAll({
      where: {
        isPublished: true,
        [Op.or]: [
          { title: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
          { tags: { [Op.like]: `%${q}%` } },
          { category: { [Op.like]: `%${q}%` } }
        ]
      },
      limit: parseInt(limit),
      attributes: ['id', 'title', 'thumbnail', 'category', 'difficulty', 'enrollmentCount', 'rating'],
      order: [['enrollmentCount', 'DESC']]
    });

    res.json({
      success: true,
      data: courses
    });
  } catch (err) {
    console.error('Erreur searchCourses:', err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche"
    });
  }
};

// Nouvelle fonction pour marquer un support comme complété
exports.completeSupport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, supportIndex } = req.body;

    if (!courseId || supportIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant du cours et l'index du support sont requis"
      });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Cours non trouvé"
      });
    }

    // Vérifier que l'index du support est valide
    if (supportIndex < 0 || supportIndex >= (course.supports?.length || 0)) {
      return res.status(400).json({
        success: false,
        message: "Index de support invalide"
      });
    }

    let progress = await Progress.findOne({
      where: { userId, courseId }
    });

    const totalSupports = course.supports?.length || 0;
    
    if (!progress) {
      // Créer une nouvelle progression
      await Course.increment('enrollmentCount', { where: { id: courseId } });
      
      progress = await Progress.create({
        userId,
        courseId,
        status: 'in_progress',
        percent: Math.round((1 / totalSupports) * 100),
        updatedAt: new Date()
      });
    } else {
      // Mettre à jour la progression existante
      const newPercent = Math.min(progress.percent + Math.round((1 / totalSupports) * 100), 100);
      const newStatus = newPercent === 100 ? 'completed' : 'in_progress';
      
      await progress.update({
        percent: newPercent,
        status: newStatus,
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        progress,
        supportIndex,
        message: "Support marqué comme complété"
      }
    });
  } catch (err) {
    console.error('Erreur completeSupport:', err);
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage du support comme complété"
    });
  }
};