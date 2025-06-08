module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define("Role", {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "roles",
  });

  return Role;
};
