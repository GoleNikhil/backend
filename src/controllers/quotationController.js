const db = require("../models");
const { Sequelize } = require("sequelize");
const Quotation = db.quotations;
const QuotationItem = db.quotationItems;
const Product = db.products;
const User = db.users; // Import the User model
const CartItem = db.cartItem;
const Cart = db.carts;
const logger = require("../utils/logger");
const orderService = require("../services/orderService");

module.exports = {
  getQuotationForm: async (req, res) => {
    try {
      const user_id = req.user.user_id;

      // Fetch user's cart
      const userCart = await Cart.findOne({ where: { user_id } });
      if (!userCart) {
        return res.status(400).json({ error: "User cart not found." });
      }

      //Selects all the products from the cart
      const cartItems = await CartItem.findAll({
        where: { cart_id: userCart.cart_id },
        include: [
          { model: Product, attributes: ["product_id", "product_name"] },
        ],
      });

      if (!cartItems.length) {
        return res
          .status(404)
          .json({ message: "No selected products in the cart." });
      }

      // Pre-fill data for the quotation form
      const quotationForm = cartItems.map((item) => ({
        product_id: item.Product.product_id,
        product_name: item.Product.product_name,
        quantity: 1, // Default quantity (customer will update)
      }));

      res
        .status(200)
        .json({ message: "Quotation form initialized.", quotationForm });
    } catch (error) {
      logger.error(`Error fetching quotation form: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  createQuotation: async (req, res) => {
    try {
      const user_id = req.user.user_id;
      const { quotation_items } = req.body; // Expecting an array of { product_id, product_name, quantity }

      if (!quotation_items || quotation_items.length === 0) {
        return res
          .status(400)
          .json({ error: "No products selected for quotation." });
      }

      // Check if the user has a cart
      const userCart = await Cart.findOne({ where: { user_id } });
      if (!userCart) {
        return res.status(400).json({ error: "User cart not found." });
      }

      // Validate that all selected products exist in the user's cart
      const cartProducts = await CartItem.findAll({
        where: { cart_id: userCart.cart_id },
        include: [
          { model: Product, attributes: ["product_id", "product_name"] },
        ],
      });

      const validProducts = cartProducts.filter((cartItem) =>
        quotation_items.some(
          (qItem) => qItem.product_id === cartItem.Product.product_id
        )
      );

      if (validProducts.length !== quotation_items.length) {
        return res
          .status(400)
          .json({ error: "Some products do not exist in the cart." });
      }

      // Create a new quotation with status "pending_admin_review"
      const quotation = await Quotation.create({
        user_id,
        status: "pending_admin_review",
      });

      if (!quotation.quotation_id) {
        throw new Error("Quotation ID is missing after creation.");
      }

      // Add products to QuotationItem with the quantity entered by the user
      const quotationItems = await Promise.all(
        quotation_items.map(async ({ product_id, quantity }) => {
          return QuotationItem.create({
            quotation_id: quotation.quotation_id,
            product_id,
            quantity,
          });
        })
      );

      //  Remove the selected products from the cart
      await CartItem.destroy({
        where: {
          cart_id: userCart.cart_id,
          product_id: quotation_items.map((item) => item.product_id),
        },
      });

      logger.info(
        `Created quotation ${quotation.quotation_id} for user ${user_id} with status "pending_admin_review"`
      );

      res.status(201).json({
        message: "Quotation submitted to admin.",
        quotation_id: quotation.quotation_id,
        quotationItems,
      });
    } catch (error) {
      logger.error(`Error creating quotation: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  adminReviewQuotation: async (req, res) => {
    try {
      const { quotation_id } = req.params;
      const { updated_items } = req.body;

      console.log("Updated Items Received:", updated_items);

      const quotation = await Quotation.findOne({
        where: { quotation_id },
      });

      if (!quotation) {
        return res
          .status(404)
          .json({ error: "Quotation not found or not ready for review." });
      }

      // Log the incoming updated items for debugging
      console.log("Updated Items Received:", updated_items);

      // Only update prices and GST, don't calculate grand_total yet
      for (const item of updated_items) {
        await QuotationItem.update(
          {
            super_admin_price: item.new_price,
            gst_percentage: item.gst_percentage || 0,
          },
          { where: { quotation_id, product_id: item.product_id } }
        );
      }

      quotation.status = "awaiting_customer_negotiation";
      await quotation.save();

      logger.info(
        `Quotation ${quotation_id} reviewed by admin with prices and GST`
      );
      res.status(200).json({ message: "Quotation reviewed successfully." });
    } catch (error) {
      logger.error(`Error reviewing quotation: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  customerNegotiation: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { quotation_id } = req.params;
      const { negotiation_items, action } = req.body;
      const user_id = req.user.user_id;

      const quotation = await Quotation.findOne({
        where: {
          quotation_id,
          user_id,
          status: "awaiting_customer_negotiation",
        },
        include: [{ model: QuotationItem }],
        transaction: t,
      });

      if (!quotation) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: "Quotation not found or negotiation not allowed." });
      }

      if (action === "approve") {
        await Promise.all(
          quotation.QuotationItems.map(async (item) => {
            const baseAmount = item.super_admin_price * item.quantity;
            const gstAmount = item.gst_percentage
              ? (baseAmount * item.gst_percentage) / 100
              : 0;
            const grandTotal = Number(baseAmount + gstAmount).toFixed(2);

            await QuotationItem.update(
              {
                final_price: item.super_admin_price,
                grand_total_price: grandTotal,
              },
              {
                where: { quotation_id, product_id: item.product_id },
                transaction: t,
              }
            );
          })
        );

        quotation.status = "finalized";
        await quotation.save({ transaction: t });

        const order = await orderService.createOrderFromQuotation(quotation, t);

        await t.commit();

        return res.status(200).json({
          success: true,
          message: "Quotation approved and order created",
          data: {
            quotation_status: "finalized",
            order: order,
          },
        });
      } else if (action === "negotiate") {
        for (const item of negotiation_items) {
          await QuotationItem.update(
            { negotiation_price: item.new_price },
            {
              where: { quotation_id, product_id: item.product_id },
              transaction: t,
            }
          );
        }

        quotation.status = "pending_admin_review";
        await quotation.save({ transaction: t });

        await t.commit();

        return res.status(200).json({
          message: "Quotation negotiation submitted successfully.",
          status: "pending_admin_review",
        });
      } else {
        await t.rollback();
        return res.status(400).json({ error: "Invalid action." });
      }
    } catch (error) {
      await t.rollback();
      logger.error(`Error in customer negotiation: ${error.message}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  finalAdminDecision: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { quotation_id } = req.params;
      const { action, updated_items } = req.body;

      if (req.user.role_id !== 5) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: "Only superadmin can make final decisions",
        });
      }

      const quotation = await Quotation.findOne({
        where: { quotation_id },
        include: [{ model: QuotationItem }],
        transaction: t,
      });

      if (!quotation) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Quotation not found",
        });
      }

      switch (action) {
        case "approve":
          await Promise.all(
            quotation.QuotationItems.map(async (item) => {
              const finalPrice = item.negotiation_price;
              const baseAmount = finalPrice * item.quantity;
              const gstAmount = item.gst_percentage
                ? (baseAmount * item.gst_percentage) / 100
                : 0;
              const grandTotal = Number(baseAmount + gstAmount).toFixed(2);

              await QuotationItem.update(
                {
                  final_price: finalPrice,
                  grand_total_price: grandTotal,
                },
                {
                  where: { quotation_id, product_id: item.product_id },
                  transaction: t,
                }
              );
            })
          );

          quotation.status = "finalized";
          await quotation.save({ transaction: t });

          const order = await orderService.createOrderFromQuotation(
            quotation,
            t
          );

          await t.commit();

          return res.status(200).json({
            success: true,
            message: "Quotation approved and order created",
            data: {
              quotation_status: "finalized",
              order: order,
            },
          });

        case "negotiate":
          if (!updated_items || updated_items.length === 0) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message: "Updated prices are required for negotiation",
            });
          }

          await Promise.all(
            updated_items.map((item) =>
              QuotationItem.update(
                { final_price: item.new_price },
                {
                  where: { quotation_id, product_id: item.product_id },
                  transaction: t,
                }
              )
            )
          );

          quotation.status = "awaiting_customer_negotiation";
          await quotation.save({ transaction: t });

          await t.commit();

          return res.status(200).json({
            success: true,
            message: "New prices set and sent to customer",
            status: "awaiting_customer_negotiation",
          });

        default:
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Invalid action. Choose 'approve' or 'negotiate'",
          });
      }
    } catch (error) {
      await t.rollback();
      logger.error(`Error in final admin decision: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: "Error processing admin decision",
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error.message,
      });
    }
  },

  customerFinalDecision: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { quotation_id } = req.params;
      const { action } = req.body;
      const user_id = req.user.user_id;

      const quotation = await Quotation.findOne({
        where: {
          quotation_id,
          user_id,
          status: "awaiting_customer_negotiation",
        },
        include: [{ model: QuotationItem }],
        transaction: t,
      });

      if (!quotation) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: "Quotation not found or approval not allowed." });
      }

      if (action === "approve") {
        await Promise.all(
          quotation.QuotationItems.map(async (item) => {
            const baseAmount = item.final_price * item.quantity;
            const gstAmount = item.gst_percentage
              ? (baseAmount * item.gst_percentage) / 100
              : 0;
            const grandTotal = Number(baseAmount + gstAmount).toFixed(2);

            await QuotationItem.update(
              {
                grand_total_price: grandTotal,
              },
              {
                where: { quotation_id, product_id: item.product_id },
                transaction: t,
              }
            );
          })
        );

        quotation.status = "finalized";
        await quotation.save({ transaction: t });

        const order = await orderService.createOrderFromQuotation(quotation, t);

        await t.commit();

        return res.status(200).json({
          success: true,
          message: "Quotation approved and order created",
          data: {
            quotation_status: "finalized",
            order: order,
          },
        });
      } else {
        await t.rollback();
        return res.status(400).json({ error: "Invalid action." });
      }
    } catch (error) {
      await t.rollback();
      logger.error(`Error in customer final decision: ${error.message}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  deleteQuotation: async (req, res) => {
    try {
      const { quotation_id } = req.params;
      const user_id = req.user.user_id;

      // Find the quotation to ensure it exists and belongs to the user
      const quotation = await Quotation.findOne({
        where: { quotation_id, user_id },
      });

      if (!quotation) {
        return res
          .status(404)
          .json({ error: "Quotation not found or access denied." });
      }

      // Delete all QuotationItems linked to this quotation
      const deletedItemsCount = await QuotationItem.destroy({
        where: { quotation_id },
      });
      logger.info(
        `Deleted ${deletedItemsCount} QuotationItems for Quotation ID: ${quotation_id}`
      );

      // Delete the Quotation itself
      const deletedQuotationCount = await Quotation.destroy({
        where: { quotation_id },
      });
      if (deletedQuotationCount === 0) {
        return res
          .status(500)
          .json({ error: "Failed to delete the quotation." });
      }

      logger.info(`Quotation ${quotation_id} deleted successfully.`);
      res
        .status(200)
        .json({ message: "Quotation and its items deleted successfully." });
    } catch (error) {
      logger.error(`Error deleting quotation: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  getQuotation: async (req, res) => {
    try {
      const { quotation_id } = req.params;
      const user_id = req.user.user_id;

      const quotation = await Quotation.findOne({
        where: { quotation_id, user_id },
        include: [
          {
            model: QuotationItem,
            attributes: [
              "quotation_item_id",
              "quantity",
              "super_admin_price",
              "negotiation_price",
              "final_price",
            ], // ✅ Now included
            include: [
              {
                model: Product,
                attributes: ["product_id", "product_name"],
              },
            ],
          },
        ],
      });

      if (!quotation) {
        return res
          .status(404)
          .json({ error: "Quotation not found or access denied." });
      }

      const quotationDetails = {
        quotation_id: quotation.quotation_id,
        status: quotation.status,
        products: quotation.QuotationItems.map((item) => ({
          product_id: item.Product ? item.Product.product_id : null,
          product_name: item.Product ? item.Product.product_name : "Unknown",
          quantity: item.quantity,
          super_admin_price: item.super_admin_price,
          negotiation_price: item.negotiation_price,
          final_price: item.final_price, // ✅ Added
        })),
      };

      logger.info(`Fetched quotation ${quotation_id} for user ${user_id}`);
      res.status(200).json(quotationDetails);
    } catch (error) {
      logger.error(`Error fetching quotation: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  getAllQuotations: async (req, res) => {
    try {
      console.log("Hello my name is Om");
      const user_id = req.user.user_id;
      console.log("Hello my name is Om");
      const quotations = await Quotation.findAll({
        where: { user_id },
        include: [
          {
            model: QuotationItem,
            attributes: [
              "quotation_item_id",
              "quantity",
              "super_admin_price",
              "negotiation_price",
              "final_price",
              "grand_total_price",
            ], // ✅ Added final_price
            include: [
              {
                model: Product,
                attributes: ["product_id", "product_name"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      if (!quotations.length) {
        return res
          .status(404)
          .json({ message: "No quotations found for this customer." });
      }

      const formattedQuotations = quotations.map((quotation) => ({
        quotation_id: quotation.quotation_id,
        status: quotation.status,
        products: quotation.QuotationItems.map((item) => ({
          product_id: item.Product ? item.Product.product_id : null,
          product_name: item.Product ? item.Product.product_name : "Unknown",
          quantity: item.quantity,
          super_admin_price: item.super_admin_price,
          negotiation_price: item.negotiation_price,
          final_price: item.final_price, // ✅ Now included in response
          grand_total_price: item.grand_total_price,
        })),
      }));

      logger.info(`Fetched all quotations for user ${user_id}`);
      res.status(200).json(formattedQuotations);
    } catch (error) {
      logger.error(`Error fetching quotations: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  getAllQuotationsForAdmin: async (req, res) => {
    try {
      console.log("Hello my name is Om");
      // Check if the user is an admin or superadmin
      if (req.user.role_id !== 5 && req.user.role_id !== 4) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Only admins or superadmins can view all quotations.",
        });
      }

      // Fetch all quotations with their items and associated products
      const quotations = await Quotation.findAll({
        include: [
          {
            model: QuotationItem,
            attributes: [
              "quotation_item_id",
              "quantity",
              "super_admin_price",
              "negotiation_price",
              "final_price",
              "gst_percentage",
              "grand_total_price",
            ],
            include: [
              {
                model: Product,
                attributes: ["product_id", "product_name", "image"],
              },
            ],
          },
          {
            model: User, // Include the User model to fetch customer details
            attributes: ["user_id", "name"], // Fetch the username
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      if (!quotations.length) {
        return res.status(404).json({ message: "No quotations found." });
      }
      // Format the response
      const formattedQuotations = quotations.map((quotation) => ({
        quotation_id: quotation.quotation_id,
        user_id: quotation.user_id,
        customer_name: quotation.User ? quotation.User.name : "Unknown", // Include customer name
        status: quotation.status,
        created_at: quotation.createdAt,
        products: quotation.QuotationItems.map((item) => ({
          product_id: item.Product ? item.Product.product_id : null,
          product_name: item.Product ? item.Product.product_name : "Unknown",
          quantity: item.quantity,
          super_admin_price: item.super_admin_price,
          negotiation_price: item.negotiation_price,
          final_price: item.final_price,
          gst_percentage: item.gst_percentage,
          grand_total_price: item.grand_total_price,
        })),
      }));
      res.status(200).json({
        success: true,
        data: formattedQuotations,
      });
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching quotations.",
        error: error.message,
      });
    }
  },
};
