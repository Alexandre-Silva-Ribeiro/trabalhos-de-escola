import { config } from "../config.js";

let sequelizeModule = null;
let sequelize = null;
let UserPreferenceModel = null;
let initialized = false;
let initError = null;

function buildDialectOptions() {
  if (!config.database.ssl) {
    return undefined;
  }

  return {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

async function loadSequelizeModule() {
  if (sequelizeModule) {
    return sequelizeModule;
  }

  try {
    sequelizeModule = await import("sequelize");
    return sequelizeModule;
  } catch {
    throw new Error("sequelize_dependency_missing:run npm install inside backend/");
  }
}

function buildSequelize(SequelizeCtor) {
  return new SequelizeCtor(config.database.url, {
    dialect: "postgres",
    logging: false,
    dialectOptions: buildDialectOptions()
  });
}

function defineModels(DataTypes) {
  UserPreferenceModel = sequelize.define(
    "UserPreference",
    {
      userId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        primaryKey: true,
        field: "user_id"
      },
      themePreference: {
        type: DataTypes.ENUM("dark", "light"),
        allowNull: false,
        defaultValue: "dark",
        field: "theme_preference"
      }
    },
    {
      tableName: config.database.preferencesTable,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
}

export async function initializeSequelize() {
  if (initialized || initError) {
    return;
  }

  if (!config.database.url) {
    initError = new Error("database_url_missing");
    throw initError;
  }

  const sequelizeSdk = await loadSequelizeModule();
  sequelize = buildSequelize(sequelizeSdk.Sequelize);
  defineModels(sequelizeSdk.DataTypes);

  try {
    await sequelize.authenticate();
    if (config.database.syncOnStart) {
      await sequelize.sync();
    }
    initialized = true;
  } catch (error) {
    initError = error;
    throw error;
  }
}

export function requireUserPreferenceModel() {
  if (initError) {
    throw new Error(`sequelize_init_failed:${String(initError.message || initError)}`);
  }

  if (!initialized || !UserPreferenceModel) {
    throw new Error("sequelize_not_initialized");
  }

  return UserPreferenceModel;
}

export async function getSequelizeHealth() {
  if (!config.database.url) {
    return { enabled: false, ready: false, message: "DATABASE_URL not set" };
  }

  if (initError) {
    return { enabled: true, ready: false, message: String(initError.message || initError) };
  }

  return { enabled: true, ready: initialized, message: initialized ? "ok" : "initializing" };
}
