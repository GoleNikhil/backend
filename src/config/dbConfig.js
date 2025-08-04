require("dotenv").config();

// Support both connection string and individual parameters
const config = {
  dialect: "postgres",
  logging: false, // Set to console.log to see SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// If DATABASE_URL is provided, use it (common for production)
if (process.env.DATABASE_URL) {
  config.url = process.env.DATABASE_URL;
} else {
  // Use individual parameters
  config.host = process.env.PGHOST || process.env.DB_HOST;
  config.username = process.env.PGUSER || process.env.DB_USER;
  config.password = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  config.database = process.env.PGDATABASE || process.env.DB_NAME;
  config.port = process.env.PGPORT || process.env.DB_PORT || 5432;
}

module.exports = config;
