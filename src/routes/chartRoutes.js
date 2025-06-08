const express = require("express");
const router = express.Router();
const chartController = require("../controllers/chartController");
const { checkPermission } = require("../middleware/checkPermission");
const authenticate = require("../middleware/authMiddleware");
// Get dashboard stats
router.get("/stats",authenticate,checkPermission("view_charts"), chartController.getDashboardStats);

// Get ticket status distribution
router.get(
  "/tickets/stats",
  authenticate,checkPermission("view_charts"),
  chartController.getTicketStats
);

// Get order status distribution
router.get(
  "/orders/stats",
  authenticate,checkPermission("view_charts"),
  chartController.getOrderStats
);

// Get monthly revenue
router.get(
  "/revenue",
  authenticate,checkPermission("view_charts"),
  chartController.getRevenueByTimeRange
);

router.get(
  "/quotations/stats",
  authenticate,checkPermission("view_charts"),
  chartController.getQuotationStats
);

module.exports = router;
