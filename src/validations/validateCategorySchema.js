// filepath: /c:/MCA/backend_trial/backend_trial/validations/validateCategorySchema.js
const Joi = require("joi");

const categorySchema = Joi.object({
  category_name: Joi.string().min(2).max(50).required().messages({
    "string.base": "Category name must be a string",
    "string.min": "Category name must be at least 2 characters",
    "string.max": "Category name cannot exceed 50 characters",
    "any.required": "Category name is required",
  }),
}).unknown(true);

module.exports = categorySchema;
