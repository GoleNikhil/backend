const express = require("express");
const router = express.Router();
const passwordResetController = require("../controllers/passwordResetController");
const { checkPermission } = require("../middleware/checkPermission");
const authenticate = require("../middleware/authMiddleware");

router.post("/request-reset", passwordResetController.requestReset);
router.post("/reset/:token", passwordResetController.resetPassword);

module.exports = router;