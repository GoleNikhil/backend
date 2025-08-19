const Joi = require("joi");

const competitivePriceSchema = Joi.object({
  product_id: Joi.number().integer().positive().required().messages({
    "number.base": "Product ID must be a number",
    "number.integer": "Product ID must be an integer",
    "number.positive": "Product ID must be a positive number",
    "any.required": "Product ID is required",
  }),
  seller_id: Joi.number().integer().positive().required().messages({
    "number.base": "Seller ID must be a number",
    "number.integer": "Seller ID must be an integer",
    "number.positive": "Seller ID must be a positive number",
    "any.required": "Seller ID is required",
  }),
  price: Joi.number().required().messages({
    "number.base": "Price must be a number",
    "any.required": "Price is required",
  }),
}).unknown(true); // Allow extra fields like createdAt, updatedAt, etc.

module.exports = competitivePriceSchema;
