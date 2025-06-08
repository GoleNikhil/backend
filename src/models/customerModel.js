module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      customer_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "users", // Refers to 'users' table
          key: "user_id", // References 'user_id' in 'users'
        },
        allowNull: false,
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
        allowNull: true,
      },
    },
    { tableName: "customers" }
  );

  return Customer;
};
