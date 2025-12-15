'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Supprimer l’ancienne table si elle existe
    await queryInterface.dropTable('UserCourses', { cascade: true });

    // Recréer proprement
    await queryInterface.createTable('UserCourses', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }, // 👈 en minuscules
        onDelete: 'CASCADE',
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'courses', key: 'id' }, // 👈 en minuscules
        onDelete: 'CASCADE',
      },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserCourses');
  }
};
