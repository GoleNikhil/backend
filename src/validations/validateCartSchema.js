// filepath: /c:/MCA/backend_trial/backend_trial/validations/cartValidation.js
const Joi = require("joi");

const cartSchema = Joi.object({
  user_id: Joi.number().integer().positive().required().messages({
    "number.base": "User ID must be a number",
    "number.integer": "User ID must be an integer",
    "number.positive": "User ID must be a positive number",
    "any.required": "User ID is required",
  }),
}).unknown(true);

module.exports = cartSchema;
