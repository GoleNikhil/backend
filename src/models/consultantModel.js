module.exports = (sequelize, DataTypes) => {
  const Consultant = sequelize.define(
    "Consultant",
    {
      consultant_id: {
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
        allowNull: false,
      },
      gst_no: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      company_size: {
        type: DataTypes.ENUM("small", "medium", "large"),
      },
    },
    { tableName: "consultants" }
  );

  return Consultant;
};
