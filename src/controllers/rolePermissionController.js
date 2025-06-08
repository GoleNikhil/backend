const logger = require("../utils/logger");
const db = require("../models");
const Role = db.roles;
const Permission = db.permissions;
const RolePermission = db.rolePermissions;

// Assign permissions to a role
const assignPermissionsToRole = async (req, res) => {
  logger.info("assignPermissionsToRole function called");
  try {
    const { role_id, permissions_ids } = req.body;

    if (
      !role_id ||
      !Array.isArray(permissions_ids) ||
      permissions_ids.length === 0
    ) {
      logger.warn("Role ID and at least one permission ID are required");
      return res.status(400).json({
        message: "Role ID and at least one permission ID are required.",
      });
    }

    // Check if role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      logger.warn("Role not found: %s", role_id);
      return res.status(404).json({ message: "Role not found." });
    }

    // Check if all permissions exist
    const permissions = await Permission.findAll({
      where: { permissions_id: permissions_ids },
    });
    if (permissions.length !== permissions_ids.length) {
      logger.warn("One or more permissions not found");
      return res
        .status(404)
        .json({ message: "One or more permissions not found." });
    }

    // Assign permissions to role (Bulk create in RolePermission table)
    await role.addPermissions(permissions);

    logger.info("assignPermissionsToRole function executed successfully");
    res
      .status(201)
      .json({ message: "Permissions assigned to role successfully." });
  } catch (error) {
    logger.error("Error assigning permissions to role: %o", error);
    res
      .status(500)
      .json({ message: "Error assigning permissions to role.", error });
  }
};

// Get all permissions assigned to a specific role
const getPermissionsByRole = async (req, res) => {
  logger.info("getPermissionsByRole function called");
  try {
    const { role_id } = req.params;

    // Check if role exists
    const role = await Role.findByPk(role_id, {
      include: {
        model: Permission,
        through: { attributes: [] }, // Exclude join table data
      },
    });

    if (!role) {
      logger.warn("Role not found: %s", role_id);
      return res.status(404).json({ message: "Role not found." });
    }

    logger.info("getPermissionsByRole function executed successfully");
    res.status(200).json(role.Permissions);
  } catch (error) {
    logger.error("Error fetching permissions for role: %o", error);
    res
      .status(500)
      .json({ message: "Error fetching permissions for role.", error });
  }
};

// Remove a specific permission from a role
const removePermissionFromRole = async (req, res) => {
  logger.info("removePermissionFromRole function called");
  try {
    const { role_id, permissions_id } = req.body;

    if (!role_id || !permissions_id) {
      logger.warn("Role ID and Permission ID are required");
      return res
        .status(400)
        .json({ message: "Role ID and Permission ID are required." });
    }

    // Check if role and permission exist
    const role = await Role.findByPk(role_id);
    const permission = await Permission.findByPk(permissions_id);

    if (!role || !permission) {
      logger.warn(
        "Role or Permission not found: role_id=%s, permissions_id=%s",
        role_id,
        permissions_id
      );
      return res.status(404).json({ message: "Role or Permission not found." });
    }

    // Remove the association
    await role.removePermission(permission);

    logger.info("removePermissionFromRole function executed successfully");
    res
      .status(200)
      .json({ message: "Permission removed from role successfully." });
  } catch (error) {
    logger.error("Error removing permission from role: %o", error);
    res
      .status(500)
      .json({ message: "Error removing permission from role.", error });
  }
};

module.exports = {
  assignPermissionsToRole,
  getPermissionsByRole,
  removePermissionFromRole,
};
