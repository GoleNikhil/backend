const paymentService = require("../services/paymentService");
const subscriptionService = require("../services/subscriptionService");
const logger = require("../utils/logger");

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscriptionpack_id,
      subscription_id,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !subscriptionpack_id
    ) {
      return res
        .status(400)
        .json({ error: "Missing required payment details." });
    }

    const isValid = paymentService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      logger.warn(`Invalid payment signature for order: ${razorpay_order_id}`);
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    await paymentService.updatePaymentStatus(
      razorpay_order_id,
      razorpay_payment_id,
      "completed"
    );

    let subscription;
    if (subscription_id) {
      subscription = await subscriptionService.finalizeUpgrade(
        req.user.user_id,
        subscription_id,
        subscriptionpack_id
      );
    } else {
      subscription = await subscriptionService.finalizeSubscription(
        req.user.user_id,
        subscriptionpack_id
      );
    }

    res.json({ success: true, message: "Payment successful", subscription });
  } catch (error) {
    logger.error("Payment verification failed:", error);
    res
      .status(500)
      .json({ error: "Payment verification failed", details: error.message });
  }
};
