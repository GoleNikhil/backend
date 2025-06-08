// filepath: /c:/MCA/backend_trial/backend_trial/validations/cartItemValidation.js
const Joi = require("joi");

const cartItemSchema = Joi.object({
  cart_id: Joi.number().integer().positive().required().messages({
    "number.base": "Cart ID must be a number",
    "number.integer": "Cart ID must be an integer",
    "number.positive": "Cart ID must be a positive number",
    "any.required": "Cart ID is required",
  }),
  product_id: Joi.number().integer().positive().required().messages({
    "number.base": "Product ID must be a number",
    "number.integer": "Product ID must be an integer",
    "number.positive": "Product ID must be a positive number",
    "any.required": "Product ID is required",
  }),
}).unknown(true);

module.exports = cartItemSchema;