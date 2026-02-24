require("dotenv").config()

const common = {
  dialect: "postgres",
  logging: false,
  migrationStorageTableName: "sequelize_meta"
}

module.exports = {
  development: {
    ...common,
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/nerdhub"
  },
  test: {
    ...common,
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/nerdhub_test"
  },
  production: {
    ...common,
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@postgres:5432/nerdhub"
  }
}

