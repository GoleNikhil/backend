const Joi = require("joi");
const productSchema = require("../validations/validateProductSchema");

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    "Product",
    {
      product_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      oem_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      product_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER,
        references: { model: "categories", key: "category_id" },
      },
      part_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      HSN_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1000,
          max: 99999999
        }
      },
      description: {
        type: DataTypes.TEXT,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      image_public_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      datasheet: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      datasheet_public_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
   
    { tableName: "products" }
    // {
    //   hooks: {
    //     beforeValidate: (product, options) => {
    //       const { error, value } = productSchema.validate(product.dataValues, {
    //         abortEarly: false,
    //       });

    //       if (error) {
    //         const errors = error.details.map((detail) => detail.message);
    //         throw new Error(`Product validation error: ${errors.join(", ")}`);
    //       }
    //       // Updating product object with validated values:
    //       Object.assign(product, value);
    //     },
    //   },
    // }
  );

  return Product;
};