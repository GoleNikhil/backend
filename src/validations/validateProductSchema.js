const Joi = require("joi");

const productSchema = Joi.object({
  product_name: Joi.string().required().messages({
    "string.base": "Product name must be a string",
    "any.required": "Product name is required",
  }),
  oem_name: Joi.string().required().messages({
    "string.base": "OEM name must be a string",
    "any.required": "OEM name is required",
  }),
  category_id: Joi.number().integer().positive().required().messages({
    "number.base": "Category ID must be a number",
    "number.integer": "Category ID must be an integer",
    "number.positive": "Category ID must be a positive number",
    "any.required": "Category ID is required",
  }),
  part_no: Joi.string().allow(null, "").messages({
    "string.base": "Part number must be a string",
  }),
  HSN_no: Joi.number()
    .integer()
    .min(1000) // Ensures 4 digits minimum
    .max(99999999) // Ensures 8 digits maximum
    .required()
    .messages({
      "number.base": "HSN number must be a number",
      "number.integer": "HSN number must be an integer",
      "number.min": "HSN number must be exactly 8 digits",
      "number.max": "HSN number must be exactly 8 digits",
      "any.required": "HSN number is required",
    }),
  description: Joi.string().allow(null, "").max(65535).messages({
    "string.base": "Description must be a string",
  }),
  image: Joi.string().uri().allow(null, "").messages({
    "string.uri": "Image must be a valid URL",
  }),
  image_public_id: Joi.string().required().messages({
    "string.base": "Image Public ID must be a string",
    "any.required": "Image Public ID is required",
  }),
  datasheet: Joi.string().uri().allow(null, "").messages({
    "string.uri": "Datasheet must be a valid URL",
  }),
  datasheet_public_id: Joi.string().allow(null, "").messages({
    "string.base": "Datasheet Public ID must be a string",
  }),
}).unknown(true); // Allows Sequelize's createdAt, updatedAt, and product_id

module.exports = productSchema;
