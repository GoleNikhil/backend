// models/Subscription.js
module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define("Subscription", {
    subscription_id: {
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

    subscriptionpack_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "subscriptionpacks",
        key: "subscriptionpack_id",
      },
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    remainingCalls: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "subscriptions",
  });

  return Subscription;
};
