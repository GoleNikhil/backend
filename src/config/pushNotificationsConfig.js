const webpush = require("web-push");
const logger = require("../utils/logger");

// Generate VAPID keys using: webpush.generateVAPIDKeys() - only needed once
// Then store these keys in your .env file
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
  "mailto:rnitesh1602@gmail.com", // Change to your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  getPublicKey: () => vapidKeys.publicKey,
};