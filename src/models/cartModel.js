// models/Cart.js
const joi = require("joi");
const cartSchema = require("../validations/validateCartSchema");

module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    "Cart",
    {
      cart_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,//Allows One cart per user
        references: { model: "users", key: "user_id" },
      },
    },    { tableName: "carts" },
    {
      hooks: {
        beforeValidate: (cart, options) => {
          const { error, value } = cartSchema.validate(cart.dataValues, {
            abortEarly: false,
          });

          if (error) {
            const errors = error.details.map((detail) => detail.message);
            throw new Error(`Cart validation error: ${errors.join(", ")}`);
          }
          // Optionally, you can update the cart object with the validated values:
          Object.assign(cart, value);
        },
      },
    },
    

  
  );
  return Cart;
};