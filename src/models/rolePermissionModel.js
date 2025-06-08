module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define("RolePermission", {
    // role_id: {
    //   // type: DataTypes.INTEGER,
    //   // references: {
    //   //   model: "roles", // Reference the Role model (string name)
    //   //   key: "role_id",
    //   // },
    //   // allowNull: false,
    // },
    // permissions_id: {
    //   type: DataTypes.INTEGER,
    //   references: {
    //     model: "permissions", // Reference the Permission model (string name)
    //     key: "permissions_id",
    //   },
    //   allowNull: false,
    // },
  },
  {
    tableName: "rolepermissions",
  });

  return RolePermission;
};
