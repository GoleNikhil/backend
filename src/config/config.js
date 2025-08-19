require("dotenv").config();

const common = {
  dialect: process.env.DB_DIALECT || "postgres",
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  logging: false,
};

module.exports = {
  development: {
    username: process.env.PGUSER || process.env.DB_USER || "postgres",
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.PGDATABASE || process.env.DB_NAME || "postgres",
    host: process.env.PGHOST || process.env.DB_HOST || "127.0.0.1",
    ...common,
  },
  test: {
    username: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    host: process.env.PGHOST || process.env.DB_HOST,
    ...common,
  },
  production: {
    username: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    host: process.env.PGHOST || process.env.DB_HOST,
    ...common,
  },
};
