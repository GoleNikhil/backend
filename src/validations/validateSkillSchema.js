const Joi = require("joi");

const skillSchema = Joi.object({
  skill_name: Joi.string().min(2).max(50).required().messages({
    "string.base": "Skill name must be a string",
    "string.min": "Skill name must be at least 2 characters",
    "string.max": "Skill name cannot exceed 50 characters",
    "any.required": "Skill name is required",
  }),
}).unknown(true);

module.exports = skillSchema;
