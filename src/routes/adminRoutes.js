const express = require("express");
const router = express.Router();

const roleController = require("../controllers/roleController");
const permissionController = require("../controllers/permissionController");
const rolePermissionController = require("../controllers/rolePermissionController");
const { checkPermission } = require("../middleware/checkPermission");
const authenticate = require("../middleware/authMiddleware");

// Role Routes
router.post("/roles", roleController.createRole);
router.get("/roles", roleController.getAllRoles);

// Permission Routes
router.post("/permissions", permissionController.createPermission);
router.get("/permissions", permissionController.getAllPermissions);

// Role-Permission Routes
router.post(
  "/role-permissions",
  rolePermissionController.assignPermissionsToRole
);
router.get(
  "/role-permissions/:role_id",
  rolePermissionController.getPermissionsByRole
);
router.delete(
  "/role-permissions",
  rolePermissionController.removePermissionFromRole
);

module.exports = router;
