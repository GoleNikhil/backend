const Joi = require("joi");

const oemSchema = Joi.object({
  oem_name: Joi.string().min(2).max(50).required().messages({
    "string.base": "OEM name must be a string",
    "string.min": "OEM name must be at least 2 characters",
    "string.max": "OEM name cannot exceed 50 characters",
    "any.required": "OEM name is required",
  }),
}).unknown(true);

module.exports = oemSchema;
