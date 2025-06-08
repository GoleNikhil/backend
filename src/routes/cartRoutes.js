const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authenticate = require("../middleware/authMiddleware");


router.post("/", authenticate, cartController.addToCart);
router.get("/", authenticate, cartController.getCartProducts);
router.delete("/removeCartItem/:cart_item_id", authenticate,  cartController.removeCartItem);
router.delete("/clearCart/", authenticate, cartController.clearCart);

module.exports = router;