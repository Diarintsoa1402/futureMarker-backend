/* FICHIER: src/models/Course.js */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Course = sequelize.define("Course", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  thumbnail: { type: DataTypes.STRING }, // URL de l'image de couverture
  category: { type: DataTypes.STRING, defaultValue: "general" }, // Catégorie du cours
  difficulty: { 
    type: DataTypes.ENUM('débutant', 'intermédiaire', 'avancé'), 
    defaultValue: 'débutant' 
  },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 }, // Durée en minutes
  tags: { type: DataTypes.JSON, defaultValue: [] }, // Tags pour recherche
  supports: { type: DataTypes.JSON, defaultValue: [] }, // Ressources
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: false }, // Statut publication
  ispublished: { type: DataTypes.BOOLEAN, defaultValue: false }, // Stats
  enrollmentCount: { type: DataTypes.INTEGER, defaultValue: 0 }, // Nombre d'inscrits
  rating: { type: DataTypes.FLOAT, defaultValue: 0 }, // Note moyenne
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "courses",
  timestamps: true,
});

module.exports = Course;