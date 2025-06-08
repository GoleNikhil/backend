const logger = require("../utils/logger");
const db = require("../models");
const Role = db.roles;

// Create a new role
const createRole = async (req, res) => {
  logger.info("createRole function called");
  try {
    const { role_name } = req.body;
    if (!role_name) {
      logger.warn("Role name is required");
      return res.status(400).json({ message: "Role name is required" });
    }

    const role = await Role.create({ role_name });
    logger.info("createRole function executed successfully");
    return res.status(201).json({ message: "Role created successfully", role });
  } catch (error) {
    logger.error("Error creating role: %o", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get all roles
const getAllRoles = async (req, res) => {
  logger.info("getAllRoles function called");
  try {
    const roles = await Role.findAll();
    logger.info("getAllRoles function executed successfully");
    return res.status(200).json({ roles });
  } catch (error) {
    logger.error("Error getting roles: %o", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { createRole, getAllRoles };
