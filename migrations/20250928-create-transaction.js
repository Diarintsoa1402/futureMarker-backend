'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entrepriseId: { type: Sequelize.INTEGER, allowNull: false },
      type: { type: Sequelize.ENUM('revenu','depense'), allowNull: false },
      montant: { type: Sequelize.FLOAT, allowNull: false },
      description: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('Transactions', ['entrepriseId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transactions');
  }
};
