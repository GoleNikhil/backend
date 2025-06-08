const Joi = require("joi");

const competitivePriceSchema = Joi.object({
  product_id: Joi.number().integer().positive().required().messages({
    "number.base": "Product ID must be a number",
    "number.integer": "Product ID must be an integer",
    "number.positive": "Product ID must be a positive number",
    "any.required": "Product ID is required",
  }),
  distributor_id: Joi.number().integer().positive().required().messages({
    "number.base": "Distributor ID must be a number",
    "number.integer": "Distributor ID must be an integer",
    "number.positive": "Distributor ID must be a positive number",
    "any.required": "Distributor ID is required",
  }),
  price: Joi.number().required().messages({
    "number.base": "Price must be a number",
    "any.required": "Price is required",
  }),
}).unknown(true); // Allow extra fields like createdAt, updatedAt, etc.

module.exports = competitivePriceSchema;
