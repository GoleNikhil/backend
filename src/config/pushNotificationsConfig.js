const webpush = require("web-push");
const logger = require("../utils/logger");

// Generate VAPID keys using: webpush.generateVAPIDKeys() - only needed once
// Then store these keys in your .env file
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "BBdtW8mMEaey3-rxMS_tYdZTmeuIYxz2QEQg7ytWJ9V4OvFDSl3iNN_fH0RQXKEAEAys2vp098JuQzFblmqo-c4",
  privateKey: process.env.VAPID_PRIVATE_KEY || "CVEq4XZJAyMCBvyl-AVKc14J8P2AtebZ-eNaKOxN5m4",
};

// Only set VAPID details if keys are properly configured
if (vapidKeys.publicKey && vapidKeys.privateKey && vapidKeys.publicKey !== "your-vapid-public-key") {
  try {
    webpush.setVapidDetails(
      "mailto:rnitesh1602@gmail.com", // Change to your email
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (error) {
    logger.error("Failed to set VAPID details:", error.message);
  }
}

module.exports = {
  webpush,
  getPublicKey: () => vapidKeys.publicKey,
};