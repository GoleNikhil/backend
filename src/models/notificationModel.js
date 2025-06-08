module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      notification_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
      },
      endpoint: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      p256dh: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      auth: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    { tableName: "notifications" }
  );

  return Notification;
};
