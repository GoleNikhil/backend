module.exports = (sequelize, DataTypes) => {
  const Distributor = sequelize.define(
    "Distributor",
    {
      distributor_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "users", // Refers to the users table
          key: "user_id", // Reference column in the users table
        },
      },
      gst_type: {
        type: DataTypes.ENUM("registered", "unregistered"),
      },
      gst_no: {
        type: DataTypes.STRING,
        unique: true,
      },
      company_size: {
        type: DataTypes.ENUM("small", "medium", "large"),
      },
      IT_admin: {
        type: DataTypes.STRING,
      },
    },
    { tableName: "distributors" });

  return Distributor;
};
