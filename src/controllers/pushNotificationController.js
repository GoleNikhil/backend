const pushConfig = require("../config/pushNotificationsConfig");
const db = require("../models");
const logger = require("../utils/logger");

exports.getPublicKey = (req, res) => {
  res.status(200).json({
    publicKey: pushConfig.getPublicKey(),
  });
};

exports.subscribe = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: "Invalid subscription data" });
    }

    // Check if notification exists
    const existingNotification = await db.notifications.findOne({
      where: {
        user_id,
        endpoint: subscription.endpoint,
      },
    });

    if (existingNotification) {
      // Update existing notification
      await existingNotification.update({
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });

      return res
        .status(200)
        .json({ message: "Notification subscription updated" });
    }

    // Create new notification
    await db.notifications.create({
      user_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    res.status(201).json({ message: "Notification subscription saved" });
  } catch (error) {
    logger.error("Error saving notification subscription:", error);
    res.status(500).json({ message: "Error saving notification subscription" });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { endpoint } = req.body;

    await db.notifications.destroy({
      where: {
        user_id,
        endpoint,
      },
    });

    res.status(200).json({ message: "Notification subscription removed" });
  } catch (error) {
    logger.error("Error removing notification subscription:", error);
    res
      .status(500)
      .json({ message: "Error removing notification subscription" });
  }
};
