const Joi = require("joi");
const quotationSchema = require("../validations/validateQuotationSchema");

module.exports = (sequelize, DataTypes) => {
  const Quotation = sequelize.define(
    "Quotation",
    {
      quotation_id: {
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
        onDelete: "CASCADE", 
      },
      status: {
        type: DataTypes.ENUM(
          "pending_admin_review",
          "awaiting_customer_negotiation",
          "finalized",
          "declined"
        ),
        defaultValue: "pending_admin_review",
      },
    },
    { tableName: "quotations" },
    {
      hooks: {
        beforeValidate: (quotation, options) => {
          const { error, value } = quotationSchema.validate(quotation.dataValues, {
            abortEarly: false,
          });

          if (error) {
            const errors = error.details.map((detail) => detail.message);
            throw new Error(`Quotation validation error: ${errors.join(", ")}`);
          }
          Object.assign(quotation, value);
        }
      }
    },
    
  );

  return Quotation;
};