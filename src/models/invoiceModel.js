// models/Invoice.js
module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    "Invoice",
    {
      invoice_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        references: { model: "orders", key: "order_id" },
      },
      invoice_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      invoice_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("generated", "paid", "cancelled"),
        defaultValue: "generated",
      },
    },
    {
      tableName: "invoices",
    }
  );
  return Invoice;
};
