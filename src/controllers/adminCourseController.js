/* FICHIER: src/controllers/adminCourseController.js */
const Course = require("../models/Course");
const { Op } = require("sequelize");
const db = require("../../models"); // Import de la configuration Sequelize

exports.getAllCoursesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, difficulty, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category && category !== 'all') where.category = category;
    if (difficulty && difficulty !== 'all') where.difficulty = difficulty;
    if (status && status !== 'all') {
      where.isPublished = status === 'published';
    }

    const { count, rows } = await Course.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        courses: rows,
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
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de la récupération des cours"
    });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      supports, 
      thumbnail, 
      category, 
      difficulty, 
      duration, 
      tags,
      instructor,
      objectives
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ 
        success: false,
        message: "Le titre et la description sont requis" 
      });
    }

    // Validation des supports
    if (supports && Array.isArray(supports)) {
      for (const support of supports) {
        if (!support.title || !support.type) {
          return res.status(400).json({
            success: false,
            message: "Chaque support doit avoir un titre et un type"
          });
        }
      }
    }

    const course = await Course.create({ 
      title, 
      description, 
      supports: supports || [],
      thumbnail,
      category,
      difficulty,
      duration: duration || 0,
      tags: tags || [],
      objectives: objectives || [],
      instructor: instructor || "Admin",
      isPublished: false,
      enrollmentCount: 0,
      rating: 0,
      totalRatings: 0
    });

    res.status(201).json({
      success: true,
      data: course,
      message: "Cours créé avec succès"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la création du cours" 
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Cours introuvable" 
      });
    }

    const allowedFields = [
      'title', 'description', 'supports', 'thumbnail', 
      'category', 'difficulty', 'duration', 'tags', 
      'isPublished', 'objectives', 'instructor'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    });

    await course.save();
    
    res.json({
      success: true,
      data: course,
      message: "Cours mis à jour avec succès"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la mise à jour du cours" 
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Cours introuvable" 
      });
    }

    await course.destroy();
    
    res.json({ 
      success: true,
      message: "Cours supprimé avec succès" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la suppression du cours" 
    });
  }
};

exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Cours introuvable" 
      });
    }

    course.isPublished = !course.isPublished;
    await course.save();
    
    res.json({ 
      success: true,
      message: `Cours ${course.isPublished ? 'publié' : 'dépublié'} avec succès`,
      data: course 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la modification du statut" 
    });
  }
};

exports.getCourseStats = async (req, res) => {
  try {
    const totalCourses = await Course.count();
    const publishedCourses = await Course.count({ where: { isPublished: true } });
    const draftCourses = totalCourses - publishedCourses;

    // Statistiques par catégorie - CORRECTION ICI
    const categoriesStats = await Course.findAll({
      attributes: [
        'category',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN isPublished THEN 1 ELSE 0 END')), 'published']
      ],
      group: ['category']
    });

    // Cours les plus populaires
    const popularCourses = await Course.findAll({
      where: { isPublished: true },
      order: [['enrollmentCount', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'enrollmentCount', 'thumbnail', 'category']
    });

    // Calcul des statistiques de progression moyenne
    const progressStats = await Course.findAll({
      where: { isPublished: true },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('enrollmentCount')), 'avgEnrollments'],
        [db.sequelize.fn('MAX', db.sequelize.col('enrollmentCount')), 'maxEnrollments'],
        [db.sequelize.fn('AVG', db.sequelize.col('rating')), 'avgRating']
      ]
    });

    res.json({
      success: true,
      data: {
        total: totalCourses,
        published: publishedCourses,
        drafts: draftCourses,
        byCategory: categoriesStats,
        popularCourses,
        analytics: progressStats[0] || {}
      }
    });
  } catch (err) {
    console.error('Erreur getCourseStats:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération des statistiques" 
    });
  }
};

// Version alternative simplifiée de getCourseStats si l'erreur persiste
exports.getCourseStatsSimple = async (req, res) => {
  try {
    const totalCourses = await Course.count();
    const publishedCourses = await Course.count({ where: { isPublished: true } });
    const draftCourses = totalCourses - publishedCourses;

    // Récupérer les catégories de manière simple
    const categories = await Course.findAll({
      attributes: ['category'],
      group: ['category'],
      raw: true
    });

    const categoriesStats = [];
    for (const cat of categories) {
      const count = await Course.count({ where: { category: cat.category } });
      const published = await Course.count({ 
        where: { 
          category: cat.category, 
          isPublished: true 
        } 
      });
      categoriesStats.push({
        category: cat.category,
        count,
        published
      });
    }

    // Cours les plus populaires
    const popularCourses = await Course.findAll({
      where: { isPublished: true },
      order: [['enrollmentCount', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'enrollmentCount', 'thumbnail', 'category']
    });

    res.json({
      success: true,
      data: {
        total: totalCourses,
        published: publishedCourses,
        drafts: draftCourses,
        byCategory: categoriesStats,
        popularCourses
      }
    });
  } catch (err) {
    console.error('Erreur getCourseStatsSimple:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération des statistiques" 
    });
  }
};

// Nouvelle fonction pour dupliquer un cours
exports.duplicateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const originalCourse = await Course.findByPk(id);
    
    if (!originalCourse) {
      return res.status(404).json({ 
        success: false,
        message: "Cours introuvable" 
      });
    }

    const duplicatedCourse = await Course.create({
      ...originalCourse.toJSON(),
      id: undefined,
      title: `${originalCourse.title} (Copie)`,
      isPublished: false,
      enrollmentCount: 0,
      rating: 0,
      totalRatings: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      data: duplicatedCourse,
      message: "Cours dupliqué avec succès"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la duplication du cours" 
    });
  }
};