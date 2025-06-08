const db = require("../models"); // Import the database models
const { Op } = require("sequelize"); // Import Sequelize Operators
const paymentService = require("../services/paymentService");
const SubscriptionPack = db.subscriptionpacks; // Correct model import
const Subscription = db.subscriptions; // Correct model import

exports.getSubscriptionPacks = async () => {
  return await SubscriptionPack.findAll({
    where: { isActive: true }, //added isactive for filtering active subscription packs
  });
};

exports.createSubscriptionPack = async (packData) => {
  if (!SubscriptionPack) {
    throw new Error("SubscriptionPack model is undefined!");
  }

  console.log("Creating subscription pack with data:", packData);
  return await SubscriptionPack.create(packData);
};

// exports.purchaseSubscription = async (user_id, subscriptionpack_id) => {
//   console.log("Received user_id:", user_id);
//   console.log("Received subscriptionpack_id:", subscriptionpack_id);

//   const pack = await SubscriptionPack.findByPk(subscriptionpack_id);
//   if (!pack) {
//     throw new Error("Subscription pack not found");
//   }

//   // Calculate start and expiry dates
//   const startDate = new Date();
//   const expiryDate = new Date();
//   expiryDate.setDate(startDate.getDate() + pack.duration);

//   const subscription = await Subscription.create({
//     user_id,
//     subscriptionpack_id: pack.subscriptionpack_id, // Ensure correct ID field
//     startDate,
//     expiryDate,
//     remainingCalls: pack.totalCalls,
//   });

//   return subscription;
// };

exports.purchaseSubscription = async (user_id, subscriptionpack_id) => {
  const pack = await SubscriptionPack.findByPk(subscriptionpack_id);
  if (!pack) {
    throw new Error("Subscription pack not found");
  }

  // ⬇️ Create a payment order before confirming the subscription
  const paymentOrder = await paymentService.createOrder(
    pack.price,
    user_id,
    subscriptionpack_id,
    null
  );

  return {
    success: true,
    message: "Payment initiated. Complete payment to activate subscription.",
    orderDetails: paymentOrder,
  };
};

// ⬇️ Once payment is verified, finalize the subscription
exports.finalizeSubscription = async (user_id, subscriptionpack_id) => {
  const pack = await SubscriptionPack.findByPk(subscriptionpack_id);
  if (!pack) {
    throw new Error("Subscription pack not found");
  }

  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + pack.duration);

  const subscription = await Subscription.create({
    user_id,
    subscriptionpack_id,
    startDate,
    expiryDate,
    remainingCalls: pack.totalCalls,
  });

  return subscription;
};

exports.getActiveSubscription = async (user_id, subscription_id) => {
  let subscription;

  try {
    if (subscription_id) {
      subscription = await Subscription.findOne({
        where: {
          id: subscription_id,
          user_id,
          expiryDate: { [Op.gt]: new Date() },
          remainingCalls: { [Op.gt]: 0 }, // Check for remaining calls
        },
      });
    } else {
      subscription = await Subscription.findOne({
        where: {
          user_id,
          expiryDate: { [Op.gt]: new Date() },
          remainingCalls: { [Op.gt]: 0 }, // Check for remaining calls
        },
        order: [["startDate", "DESC"]],
      });
    }

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Add subscription status details
    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.expiryDate - now) / (1000 * 60 * 60 * 24)
    );

    return {
      subscription,
      status: {
        isActive: true,
        remainingCalls: subscription.remainingCalls,
        daysRemaining,
        expiresOn: subscription.expiryDate,
      },
    };
  } catch (error) {
    throw new Error(`Subscription check failed: ${error.message}`);
  }
};

exports.decrementRemainingCalls = async (subscription_id) => {
  const subscription = await Subscription.findByPk(subscription_id);
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  if (subscription.remainingCalls <= 0) {
    throw new Error("No remaining calls in subscription");
  }

  subscription.remainingCalls -= 1;
  await subscription.save();
  return subscription;
};

// exports.upgradeSubscription = async (
//   user_id,
//   subscription_id,
//   new_subscriptionpack_id
// ) => {
//   const subscription = await Subscription.findOne({
//     where: { subscription_id, user_id }, // Ensure correct ID field
//   });
//   if (!subscription) {
//     throw new Error("Subscription not found");
//   }

//   // if (subscription.remainingCalls > 0) {
//   //   throw new Error("Cannot upgrade until remaining calls are exhausted");
//   // }

//   const newPack = await SubscriptionPack.findByPk(new_subscriptionpack_id);
//   if (!newPack) {
//     throw new Error("New subscription pack not found");
//   }

//   // Calculate new dates
//   const startDate = new Date();
//   const expiryDate = new Date();
//   expiryDate.setDate(startDate.getDate() + newPack.duration);

//   subscription.subscriptionpack_id = newPack.subscriptionpack_id; // Ensure correct ID field
//   subscription.startDate = startDate;
//   subscription.expiryDate = expiryDate;
//   subscription.remainingCalls =
//     subscription.remainingCalls + newPack.totalCalls;

//   await subscription.save();
//   return subscription;
// };

exports.upgradeSubscription = async (
  user_id,
  subscription_id,
  new_subscriptionpack_id
) => {
  const subscription = await Subscription.findOne({
    where: { subscription_id, user_id },
  });
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const newPack = await SubscriptionPack.findByPk(new_subscriptionpack_id);
  if (!newPack) {
    throw new Error("New subscription pack not found");
  }

  // ⬇️ Create a payment order before confirming the upgrade
  const paymentOrder = await paymentService.createOrder(
    newPack.price,
    user_id,
    new_subscriptionpack_id,
    subscription_id
  );

  return {
    success: true,
    message: "Payment initiated. Complete payment to finalize upgrade.",
    orderDetails: paymentOrder,
  };
};

// ⬇️ Finalize upgrade after payment verification
exports.finalizeUpgrade = async (
  user_id,
  subscription_id,
  new_subscriptionpack_id
) => {
  const subscription = await Subscription.findOne({
    where: { subscription_id, user_id },
  });
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const newPack = await SubscriptionPack.findByPk(new_subscriptionpack_id);
  if (!newPack) {
    throw new Error("New subscription pack not found");
  }

  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + newPack.duration);

  subscription.subscriptionpack_id = newPack.subscriptionpack_id;
  subscription.startDate = startDate;
  subscription.expiryDate = expiryDate;
  subscription.remainingCalls += newPack.totalCalls;

  await subscription.save();
  return subscription;
};

exports.deleteSubscriptionPack = async (subscriptionpack_id) => {
  // Find the pack by primary key.
  const pack = await SubscriptionPack.findByPk(subscriptionpack_id);
  if (!pack) {
    throw new Error("Subscription pack not found");
  }

  // Optionally, you can check for active subscriptions here:
  // const activeSubscriptions = await Subscription.count({ where: { subscriptionpack_id, ... } });
  // if (activeSubscriptions > 0) {
  //   // Either prevent deletion or warn the admin.
  // }

  // Soft delete by marking the pack as inactive.
  pack.isActive = false;
  await pack.save();
  return pack;
};
