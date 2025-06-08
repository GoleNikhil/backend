const Joi = require("joi");
const quotationItemSchema = require("../validations/validateQuotationItemSchema");

module.exports = (sequelize, DataTypes) => {
  const QuotationItem = sequelize.define(
    "QuotationItem",
    {
      quotation_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      quotation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "quotations", key: "quotation_id" },
        onDelete: "CASCADE",
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "products", key: "product_id" },
        onDelete: "CASCADE",
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
      },
      super_admin_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      negotiation_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      final_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      gst_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        }
      },
      grand_total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      }
    },
     { tableName: "quotationItems" },
    {
      hooks: {
        beforeValidate: (quotationItem, options) => {
          if (!quotationItemSchema) {
            throw new Error("QuotationItem validation schema is not defined.");
          }

          const { error, value } = quotationItemSchema.validate(quotationItem.dataValues, {
            abortEarly: false,
            context: { isUpdate: !quotationItem.isNewRecord },
          });

          if (error) {
            throw new Error(`QuotationItem validation error: ${error.message}`);
          }
        }
      }
    },
   
  );

  return QuotationItem;
};