const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require("../models");

const Payment = db.payments;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (
  amount,
  user_id,
  subscriptionpack_id,
  subscription_id = null
) => {
  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency: "INR",
    receipt: `receipt_${user_id}_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);

  await Payment.create({
    user_id,
    order_id: order.id,
    amount,
    currency: order.currency,
    status: "pending",
    subscriptionpack_id,
    subscription_id,
    payment_type: subscription_id ? "upgrade" : "purchase",
  });

  return order;
};

exports.verifySignature = (order_id, payment_id, signature) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  return generatedSignature === signature;
};

exports.updatePaymentStatus = async (order_id, payment_id, status) => {
  const payment = await Payment.findOne({ where: { order_id } });
  if (!payment) {
    throw new Error("Payment not found");
  }

  payment.payment_id = payment_id;
  payment.status = status;
  await payment.save();
};
