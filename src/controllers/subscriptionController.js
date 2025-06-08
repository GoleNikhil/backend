const logger = require("../utils/logger");
const subscriptionService = require("../services/subscriptionService");

exports.getSubscriptionPacks = async (req, res, next) => {
  logger.info("getSubscriptionPacks function called");
  try {
    const packs = await subscriptionService.getSubscriptionPacks();
    logger.info("getSubscriptionPacks function executed successfully");
    res.status(200).json(packs);
  } catch (error) {
    logger.error("Error getting subscription packs: %o", error);
    next(error);
  }
};

exports.createSubscriptionPack = async (req, res, next) => {
  logger.info("createSubscriptionPack function called");
  try {
    const { name, description, price, duration, totalCalls } = req.body;

    if (!name || !description || !price || !duration || !totalCalls) {
      logger.warn("All fields are required");
      return res.status(400).json({ error: "All fields are required." });
    }

    const pack = await subscriptionService.createSubscriptionPack({
      name,
      description,
      price,
      duration,
      totalCalls,
    });

    logger.info("createSubscriptionPack function executed successfully");
    res.status(201).json(pack);
  } catch (error) {
    logger.error("Error creating subscription pack: %o", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
    next(error);
  }
};

// exports.purchaseSubscription = async (req, res, next) => {
//   logger.info("purchaseSubscription function called");
//   try {
//     // user_id is attached by the auth middleware.
//     const user_id = req.user.user_id;

//     const { subscriptionpack_id } = req.body;
//     const subscription = await subscriptionService.purchaseSubscription(
//       user_id,
//       subscriptionpack_id
//     );
//     logger.info("purchaseSubscription function executed successfully");
//     res.status(201).json(subscription);
//   } catch (error) {
//     logger.error("Error purchasing subscription: %o", error);
//     next(error);
//   }
// };

exports.purchaseSubscription = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const { subscriptionpack_id } = req.body;

    const paymentResponse = await subscriptionService.purchaseSubscription(
      user_id,
      subscriptionpack_id
    );
    res.status(201).json(paymentResponse);
  } catch (error) {
    logger.error("Error purchasing subscription:", error);
    next(error);
  }
};

// exports.upgradeSubscription = async (req, res, next) => {
//   logger.info("upgradeSubscription function called");
//   try {
//     const user_id = req.user.user_id;
//     const { subscription_id, new_subscriptionpack_id } = req.body;
//     const updatedSubscription = await subscriptionService.upgradeSubscription(
//       user_id,
//       subscription_id,
//       new_subscriptionpack_id
//     );
//     logger.info("upgradeSubscription function executed successfully");
//     res.status(200).json(updatedSubscription);
//   } catch (error) {
//     logger.error("Error upgrading subscription: %o", error);
//     next(error);
//   }
// };

exports.upgradeSubscription = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const { subscription_id, new_subscriptionpack_id } = req.body;

    const paymentResponse = await subscriptionService.upgradeSubscription(
      user_id,
      subscription_id,
      new_subscriptionpack_id
    );
    res.status(200).json(paymentResponse);
  } catch (error) {
    logger.error("Error upgrading subscription:", error);
    next(error);
  }
};

exports.deleteSubscriptionPack = async (req, res, next) => {
  logger.info("deleteSubscriptionPack function called");
  try {
    const { subscriptionpack_id } = req.params;
    const pack =
      await subscriptionService.deleteSubscriptionPack(subscriptionpack_id);
    logger.info("deleteSubscriptionPack function executed successfully");
    res.status(200).json({ message: "Subscription pack deleted (soft)", pack });
  } catch (error) {
    logger.error("Error deleting subscription pack: %o", error);
    next(error);
  }
};

exports.getActiveSubscription = async (req, res, next) => {
  logger.info("getActiveSubscription function called");
  try {
    const user_id = req.user.user_id;
    const { subscription_id } = req.query;
    
    const activeSubscription = await subscriptionService.getActiveSubscription(
      user_id,
      subscription_id
    );
    
    logger.info("getActiveSubscription function executed successfully");
    res.status(200).json(activeSubscription);
  } catch (error) {
    logger.error("Error getting active subscription: %o", error);
    next(error);
  }
};