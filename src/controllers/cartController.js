const db = require("../models");
const Product = db.products;
const Cart = db.carts;
const CartItem = db.cartItem;
const logger = require("../utils/logger");
const cartController = {
  
  addToCart: async (req, res) => {
    try {

      const user_id = req.user.user_id;
      const { product_id } = req.body;

      
      let cart = await Cart.findOne({ where: { user_id } });
      if (!cart) {
        cart = await Cart.create({ user_id });
      }

      // Check if the product already exists in the cart
      let cartItem = await CartItem.findOne({ where: { cart_id: cart.cart_id, product_id } });

      if (cartItem) {
        logger.info(`Product ${product_id} already exists in cart for user ${user_id}`);
        return res.status(400).json({
          message: "Product is already added to cart"
        });
      }
      // Create new cart item if product doesn't exist in cart
      await CartItem.create({ cart_id: cart.cart_id, product_id });

      logger.info(`User ${user_id} added product ${product_id} to cart`);
      res.status(200).json({ message: "Product added to cart successfully" });
    } catch (error) {
      logger.error(`Error adding product to cart for user ${req.user.user_id}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all products in a user's cart
  getCartProducts: async (req, res) => {
    try {

      const user_id = req.user.user_id;

      if (!user_id) return res.status(400).json({ error: "User ID is required." });

      const cartItems = await CartItem.findAll({
        include: [
          {
            model: Product,
            attributes: [
              "product_id",
              "product_name",
              "oem_name",
              "description",
              "image",
              "datasheet",
              "category_id",
              "part_no", 
              "HSN_no",  
            ],
          },
          {
            model: Cart,
            attributes: [], 
            where: { user_id }, 
          },
        ],

      });

      if (!cartItems.length) {
        logger.info(`No products found in cart for user ${user_id}`);
        return res.status(404).json({ message: "No products found in cart." })
      };

      const products = cartItems.map((item) => ({
        cart_item_id: item.cart_item_id,
        product_id: item.Product.product_id,
        product_name: item.Product.product_name,
        oem_name: item.Product.oem_name,
        description: item.Product.description,
        image: item.Product.image,
        datasheet: item.Product.datasheet,
        category_id: item.Product.category_id,
        part_no: item.Product.part_no, 
        HSN_no: item.Product.HSN_no,  
      }));

      logger.info(`Fetched cart products for user ${user_id}`);
      res.status(200).json(products);
    } catch (error) {
      logger.error(`Error fetching cart products for user ${req.user.user_id}: ${error.message}`);
      console.error("Error fetching cart products:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Remove product from cart
  removeCartItem: async (req, res) => {
    try {
      const { cart_item_id } = req.params;

      const cartItem = await CartItem.findByPk(cart_item_id);
      if (!cartItem) {
        logger.info(`Cart item ${cart_item_id} not found`);
        return res.status(404).json({ message: "Cart item not found" });
      }

      await cartItem.destroy();

      logger.info(`Removed cart item ${cart_item_id}`);
      res.status(200).json({ message: "Cart item removed successfully" });
    } catch (error) {
      logger.error(`Error removing cart item ${req.params.cart_item_id}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },


  // Clear user's cart
  clearCart: async (req, res) => {
    try {
      const user_id = req.user.user_id;

      const cart = await Cart.findOne({ where: { user_id } });
      if (!cart) {
        logger.info(`Cart not found for user ${user_id}`);
        return res.status(404).json({ message: "Cart not found" });
      }

      await CartItem.destroy({ where: { cart_id: cart.cart_id } });

      logger.info(`Cleared cart for user ${user_id}`);
      res.status(200).json({ message: "Cart cleared successfully" });
    } catch (error) {
      logger.error(`Error clearing cart for user ${req.user.user_id}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

}

module.exports = cartController;