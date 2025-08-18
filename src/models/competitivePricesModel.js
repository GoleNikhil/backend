const joi = require("joi");
const competitivePriceSchema = require("../validations/validateCompetitivePriceSchema");

module.exports = (sequelize, DataTypes) => {
  const CompetitivePrices = sequelize.define(
    "CompetitivePrices",
    {
      product_id: {
        type: DataTypes.INTEGER,
        references: { model: "products", key: "product_id" },
        allowNull: false,
      },
      seller_id: {
        type: DataTypes.INTEGER,
        references: { model: "users", key: "user_id" },
        allowNull: false,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
      { tableName: "competitiveprices" },
    {
      hooks: {
        beforeValidate: (competitivePrice, options) => {
          const { error, value } = competitivePriceSchema.validate(
            competitivePrice.dataValues,
            {
              abortEarly: false,
            }
          );

          if (error) {
            const errors = error.details.map((detail) => detail.message);
            throw new Error(
              `CompetitivePrice validation error: ${errors.join(", ")}`
            );
          }
          Object.assign(competitivePrice, value);
        },
      },
    },
  
  );

  return CompetitivePrices;
};
