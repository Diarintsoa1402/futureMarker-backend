'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 🔹 1. Supprimer les enregistrements orphelins
    await queryInterface.sequelize.query(`
      DELETE FROM "Fundings"
      WHERE "projectId" NOT IN (SELECT "id" FROM "projects");
    `);

    // 🔹 2. Supprimer la contrainte FK existante si elle bloque
    await queryInterface.sequelize.query(`
      ALTER TABLE "Fundings" DROP CONSTRAINT IF EXISTS "Fundings_projectId_fkey1";
    `);

    // 🔹 3. Recréer la contrainte proprement
    await queryInterface.addConstraint("Fundings", {
      fields: ["projectId"],
      type: "foreign key",
      name: "Fundings_projectId_fkey1",
      references: {
        table: "projects",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    // rollback : supprimer la FK recréée
    await queryInterface.removeConstraint("Fundings", "Fundings_projectId_fkey1");
  }
};
