const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authenticate = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/checkPermission");

// Get all orders (superadmin only)
router.get("/all", authenticate, orderController.getAllOrders);

// Get customer's orders
router.get("/my-orders", authenticate, orderController.getCustomerOrders);

// Get specific order details
router.get("/:order_id", authenticate, orderController.getOrderById);

// Update order status (superadmin only)
router.patch("/:order_id/status", authenticate, orderController.updateOrderStatus);

module.exports = router;