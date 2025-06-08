const Joi = require("joi");

const quotationItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).optional().messages({
    "number.base": "Quantity must be a number",
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity must be at least 1",
  }),
  super_admin_price: Joi.number().positive().optional().messages({
    "number.base": "Super Admin Price must be a number",
    "number.positive": "Super Admin Price must be a positive number",
  }),
  negotiation_price: Joi.number().positive().optional().messages({
    "number.base": "Negotiation Price must be a number",
    "number.positive": "Negotiation Price must be a positive number",
  }),
  final_price: Joi.number().positive().optional().messages({
    "number.base": "Final Price must be a number",
    "number.positive": "Final Price must be a positive number",
  }),
  gst_percentage: Joi.number()
    .precision(2)
    .min(0)
    .max(100)
    .allow(null)
    .messages({
      'number.base': 'GST percentage must be a number',
      'number.min': 'GST percentage cannot be negative',
      'number.max': 'GST percentage cannot exceed 100%',
      'number.precision': 'GST percentage can have maximum 2 decimal places'
    }),
  grand_total_price: Joi.number()
    .precision(2)
    .min(0)
    .allow(null)
    .messages({
      'number.base': 'Grand total price must be a number',
      'number.min': 'Grand total price cannot be negative',
      'number.precision': 'Grand total price can have maximum 2 decimal places'
    })
}).unknown(true); 

module.exports = quotationItemSchema;