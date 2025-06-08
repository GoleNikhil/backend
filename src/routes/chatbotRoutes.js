const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");

router.post("/chat", chatbotController.handleChat);
router.get("/status", chatbotController.getStatus);

module.exports = {
  router,
  initializeChatbot: chatbotController.initializeChatbot,
};
