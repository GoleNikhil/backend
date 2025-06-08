const Joi = require("joi");

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.base": "Name must be a string",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.base": "Email must be a string",
    "string.email": "Email must be a valid email",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.base": "Password must be a string",
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
  mobile_no: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      "string.base": "Mobile number must be a string",
      "string.pattern.base": "Mobile number must be a 10-digit number",
      "any.required": "Mobile number is required",
    }),
  address: Joi.string().required().messages({
    "string.base": "Address must be a string",
    "any.required": "Address is required",
  }),
  role_name: Joi.string()
    .valid("customer", "consultant", "distributor", "freelancer", "superadmin")
    .required()
    .messages({
      "string.base": "Role name must be a string",
      "any.only": "Invalid role name",
      "any.required": "Role name is required",
    }),
  gst_type: Joi.string()
    .valid("registered", "unregistered")
    .allow("")
    .optional()
    .messages({
      "string.base": "GST Type must be a string",
    }),
  
  gst_no: Joi.string()
    .when("gst_type", {
      is: "registered",
      then: Joi.required().messages({
        "any.required": "GST Number is required when GST Type is registered",
      }),
      otherwise: Joi.allow("").optional(),
    })
    .messages({
      "string.base": "GST Number must be a string",
    }),

  company_size: Joi.string()
    .valid("small", "medium", "large")
    .allow("")
    .optional()
    .messages({
      "string.base": "Company Size must be a string",
    }),
  IT_admin: Joi.string().allow("").optional().messages({
    "string.base": "IT Admin must be a string",
  }),
  experience: Joi.number().integer().min(0).allow(null).optional().messages({
    "number.base": "Experience must be a number",
    "number.integer": "Experience must be an integer",
    "number.min": "Experience cannot be negative",
  }),
  skill_ids: Joi.alternatives()
    .try(
      Joi.array().items(Joi.number().integer().min(1)),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            return helpers.error("string.invalidArray");
          }
          // Validate each item is a number > 0
          for (const item of parsed) {
            if (
              typeof item !== "number" ||
              item < 1 ||
              !Number.isInteger(item)
            ) {
              return helpers.error("string.invalidArrayItems");
            }
          }
          return parsed; // Return the parsed array
        } catch (e) {
          return helpers.error("string.invalidJson");
        }
      })
    )
    .when("role_name", {
      is: "freelancer",
      then: Joi.required().messages({
        "any.required": "Skill IDs are required for freelancers",
        "string.invalidJson": "Skill IDs must be a valid JSON array",
        "string.invalidArray": "Skill IDs must be an array",
        "string.invalidArrayItems": "Skill IDs must contain positive integers",
      }),
      otherwise: Joi.forbidden(),
    }),
}).required();

const validateUser = (req, res, next) => {
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = {};
    error.details.forEach((detail) => {
      errors[detail.path[0]] = detail.message;
    });
    return res.status(400).json({ errors });
  }

  req.validatedData = value;
  next();
};

module.exports = validateUser;
