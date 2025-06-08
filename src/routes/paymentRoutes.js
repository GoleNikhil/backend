const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authenticate = require("../middleware/authMiddleware"); // Ensures user is logged in
const { checkPermission } = require("../middleware/checkPermission");
// 🔹 Route to verify and complete payment after user completes it on Razorpay
router.post("/verify", authenticate, paymentController.verifyPayment);

module.exports = router;
