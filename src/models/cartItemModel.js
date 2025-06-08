const joi = require("joi");
const cartItemSchema = require("../validations/validateCartItemSchema");

module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    "CartItem",
    {
      cart_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cart_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "carts", key: "cart_id" },
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "products", key: "product_id" },
      },
    },
        { tableName: "cartitems" },
    {
      hooks: {
        beforeValidate: (cartItem, options) => {
          const { error, value } = cartItemSchema.validate(
            cartItem.dataValues,
            {
              abortEarly: false,
            }
          );

          if (error) {
            const errors = error.details.map((detail) => detail.message);
            throw new Error(`CartItem validation error: ${errors.join(", ")}`);
          }
          // Optionally, you can update the cartItem object with the validated values:
          Object.assign(cartItem, value);
        },
      },
    },

  );
  return CartItem;
};