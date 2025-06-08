module.exports = (sequelize, DataTypes) => {
    const PendingRegistration = sequelize.define("PendingRegistration", {
      pending_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      registration_data: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "roles",
          key: "role_id",
        },
      },
  
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "pendingregistrations",
    
    });
    return PendingRegistration;
  };