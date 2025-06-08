// models/Category.js
const joi = require("joi");
const categorySchema = require("../validations/validateCategorySchema");
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category",
    {
      category_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_name: { type: DataTypes.STRING, allowNull: false },
    },
     { tableName: "categories" },
    {
      hooks: {
        beforeValidate: (category, options) => {
          const { error, value } = categorySchema.validate(
            category.dataValues,
            {
              abortEarly: false,
            }
          );

          if (error) {
            const errors = error.details.map((detail) => detail.message);
            throw new Error(`Category validation error: ${errors.join(", ")}`);
          }
          // Optionally, you can update the category object with the validated values:
          Object.assign(category, value);
        },
      },
    },
   

  );
  return Category;
};
