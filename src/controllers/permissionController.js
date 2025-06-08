const logger = require("../utils/logger");
const db = require("../models");
const Permission = db.permissions;
const RolePermission = db.rolePermissions;

// Create a new permission and auto-assign to Admin
const createPermission = async (req, res) => {
  logger.info("createPermission function called");
  try {
    const { permissions_name } = req.body;

    // Check if permission name is provided
    if (!permissions_name) {
      logger.warn("Permission name is required");
      return res.status(400).json({ message: "Permission name is required." });
    }

    // Create new permission
    const newPermission = await Permission.create({ permissions_name });

    // Auto-assign to Admin
    await RolePermission.create({
      role_id: 5,
      permissions_id: newPermission.permissions_id,
    });

    logger.info("createPermission function executed successfully");
    res.status(201).json({
      message: "Permission created and assigned to Admin",
      permission: newPermission,
    });
  } catch (error) {
    logger.error("Error creating permission: %o", error);
    res.status(500).json({ message: "Error creating permission.", error });
  }
};

// Get all permissions
const getAllPermissions = async (req, res) => {
  logger.info("getAllPermissions function called");
  try {
    const permissions = await Permission.findAll();
    logger.info("getAllPermissions function executed successfully");
    res.status(200).json(permissions);
  } catch (error) {
    logger.error("Error fetching permissions: %o", error);
    res.status(500).json({ message: "Error fetching permissions.", error });
  }
};

module.exports = { createPermission, getAllPermissions };
