// routes/subscriptionRoutes.js
const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const authenticate = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/checkPermission");

// Get all available subscription packs.
router.get("/packs", subscriptionController.getSubscriptionPacks);

router.post("/create", subscriptionController.createSubscriptionPack);
// Purchase a subscription pack (requires authentication).
router.post(
  "/purchase",
  authenticate,
  subscriptionController.purchaseSubscription
);

// Get user's active subscription (requires authentication)
router.get(
  "/active",
  authenticate,
  subscriptionController.getActiveSubscription
);

// Upgrade an existing subscription (requires authentication).
router.patch(
  "/upgrade",
  authenticate,
  subscriptionController.upgradeSubscription
);
router.delete(
  "/packs/:subscriptionpack_id",
  subscriptionController.deleteSubscriptionPack
);

module.exports = router;

