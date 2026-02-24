"use strict"

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_preferences_local", {
      user_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        primaryKey: true
      },
      theme_preference: {
        type: Sequelize.ENUM("dark", "light"),
        allowNull: false,
        defaultValue: "dark"
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_preferences_local")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_preferences_local_theme_preference";')
  }
}

