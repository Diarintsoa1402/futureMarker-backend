const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProjectUpdate = sequelize.define("ProjectUpdate", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  projectId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    field: 'project_id'  // ← Mapping snake_case (ajuste si différent)
  },
  progress: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  status: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  updateNote: { 
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'update_note'  // ← Mapping si snake_case
  },
  updatedBy: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    field: 'updated_by'  // ← FIX PRINCIPAL : Mappe à la colonne DB réelle
  }
}, {
  timestamps: true,
  tableName: 'ProjectUpdates',
  underscored: true  // ← Global : Force snake_case pour createdAt/updatedAt aussi (ex. created_at)
});

module.exports = ProjectUpdate;