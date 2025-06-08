const Joi = require("joi");

const ticketSchema = Joi.object({
  user_id: Joi.number().integer().positive().required().messages({
    "number.base": "User ID must be a number",
    "number.integer": "User ID must be an integer",
    "number.positive": "User ID must be a positive number",
    "any.required": "User ID is required",
  }),
  status: Joi.string()
    .valid("open", "in_progress", "resolved", "closed")
    .default("open")
    .messages({
      "string.base": "Status must be a string",
      "any.only":
        'Status must be one of: "open", "in_progress", "resolved", "closed"',
    }),
  description: Joi.string().allow("").messages({
    "string.base": "Description must be a string",
  }),
  skill_id: Joi.number().integer().positive().allow(null).messages({
    "number.base": "Skill ID must be a number",
    "number.integer": "Skill ID must be an integer",
    "number.positive": "Skill ID must be a positive number",
  }),
}).unknown(true); // 👈 Allows Sequelize's createdAt, updatedAt, and product_id;

module.exports = ticketSchema;
