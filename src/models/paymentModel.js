module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define("Payment", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Each order should be unique
      },
      payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true, // Set to NULL initially, updated after payment verification
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "INR",
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed"),
        defaultValue: "pending",
      },
      payment_type: {
        type: DataTypes.ENUM("purchase", "upgrade"),
        allowNull: false,
      },
      subscriptionpack_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "subscriptionpacks",
          key: "subscriptionpack_id",
        },
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "subscriptions",
          key: "subscription_id",
        },
        allowNull: true, // Null for new purchases, required for upgrades
      },
    },
    {
      tableName: "payments",
      // Automatically manage createdAt and updatedAt fields
    });
  
    return Payment;
  };