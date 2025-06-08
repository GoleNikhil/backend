const express = require("express");
const router = express.Router();
const pushNotificationController = require("../controllers/pushNotificationController");
const authenticate = require("../middleware/authMiddleware");

router.get("/key", pushNotificationController.getPublicKey);
router.post("/subscribe", authenticate, pushNotificationController.subscribe);
router.post(
  "/unsubscribe",
  authenticate,
  pushNotificationController.unsubscribe
);

module.exports = router;
