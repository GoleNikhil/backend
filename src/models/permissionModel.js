const { UniqueConstraintError } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define("Permission", {
    permissions_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    permissions_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "permissions",
  });

  return Permission;
};
