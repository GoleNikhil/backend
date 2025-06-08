// models/SubscriptionPack.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SubscriptionPack = sequelize.define("SubscriptionPack", {
    subscriptionpack_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Duration in days",
    },
    totalCalls: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isActive: {//added new field
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "subscriptionpacks",
  });

  return SubscriptionPack;
};
