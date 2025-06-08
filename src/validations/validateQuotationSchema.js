const Joi = require("joi");

const quotationSchema = Joi.object({
  // quotation_id: Joi.number().integer().positive().optional().messages({
  //   "number.base": "Quotation ID must be a number",
  //   "number.integer": "Quotation ID must be an integer",
  //   "number.positive": "Quotation ID must be a positive number",
  // }),
  user_id: Joi.number().integer().positive().required().messages({
    "number.base": "User ID must be a number",
    "number.integer": "User ID must be an integer",
    "number.positive": "User ID must be a positive number",
    "any.required": "User ID is required",
  }),
  status: Joi.string().valid(
    "pending_admin_review",
    "awaiting_customer_negotiation",
    "finalized",
    "declined"
  ).required().messages({
    "any.only": "Status must be one of: pending_admin_review, awaiting_customer_negotiation, finalized, declined",
  }),
}).unknown(true); // Allow additional fields

module.exports = quotationSchema;