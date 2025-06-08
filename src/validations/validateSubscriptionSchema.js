const Joi = require("joi");

const subscriptionSchema = Joi.object({
  subscription_name: Joi.string().min(3).max(50).required().messages({
    "string.base": "Subscription name must be a string",
    "string.min": "Subscription name must be at least 3 characters",
    "string.max": "Subscription name cannot exceed 50 characters",
    "any.required": "Subscription name is required",
  }),
  subscription_price: Joi.number().positive().precision(2).required().messages({
    "number.base": "Subscription price must be a number",
    "number.positive": "Subscription price must be a positive number",
    "number.precision": "Subscription price must have a precision of 2",
    "any.required": "Subscription price is required",
  }),
  subscription_duration: Joi.number().integer().positive().required().messages({
    "number.base": "Subscription duration must be a number",
    "number.integer": "Subscription duration must be an integer",
    "number.positive": "Subscription duration must be a positive number",
    "any.required": "Subscription duration is required",
  }),
  subscription_type: Joi.string()
    .valid("Gold", "Silver", "Bronze")
    .required()
    .messages({
      "string.base": "Subscription type must be a string",
      "any.only":
        'Subscription type must be one of: "Gold", "Silver", "Bronze"',
      "any.required": "Subscription type is required",
    }),
}).unknown(true);

module.exports = subscriptionSchema;
