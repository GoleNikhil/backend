const db = require("../models");
const logger = require("../utils/logger");

const SUPERADMIN_ROLE_ID = 5;

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Check if user exists in request
      if (!req.user || !req.user.user_id) {
        logger.error("No authenticated user found");
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userId = req.user.user_id;

      // Get user's role with permissions
      const user = await db.users.findByPk(userId, {
        include: [
          {
            model: db.roles,
            include: [
              {
                model: db.permissions,
                through: db.rolePermissions,
              },
            ],
          },
        ],
      });

      if (!user || !user.Role) {
        logger.warn(`No role assigned for user: ${userId}`);
        return res.status(403).json({
          success: false,
          message: "No role assigned",
        });
      }

      // Check if user is superadmin
      if (user.Role.role_id === SUPERADMIN_ROLE_ID) {
        logger.info(`Superadmin access granted for user: ${userId}`);
        return next();
      }

      // Check if user's role has the required permission
      const rolePermissions = Array.isArray(user.Role.Permissions)
        ? user.Role.Permissions
        : [];
      const hasPermission = rolePermissions.some(
        (permission) => permission.permissions_name === requiredPermission
      );

      if (!hasPermission) {
        logger.warn(
          `Permission denied for user: ${userId}, required permission: ${requiredPermission}`
        );
        return res.status(403).json({
          success: false,
          message: "You don't have permission to perform this action",
        });
      }

      logger.info(`Permission granted for user: ${userId}`);
      next();
    } catch (error) {
      logger.error("Permission check error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
      });
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

module.exports = {
  checkPermission,
  SUPERADMIN_ROLE_ID,
};
