require("dotenv").config();

module.exports = {
  host: process.env.MYSQLHOST,
  username: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
 // Optional, but good to include
  dialect: "mysql",
};
