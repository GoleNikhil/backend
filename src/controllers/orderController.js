const db = require("../models");
const logger = require("../utils/logger");

// Get all orders (superadmin only)
exports.getAllOrders = async (req, res) => {
    try {
        // Check if user is superadmin (role_id = 5)
        const isSuperAdmin = req.user.role_id === 5;

        if (!isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Superadmin only.",
            });
        }

        const orders = await db.orders.findAll({
            include: [
              {
                model: db.quotations,
                include: [
                  {
                    model: db.quotationItems,
                    include: [{ model: db.products }],
                  },
                  {
                    model: db.users,
                    attributes: ["user_id", "name", "email", "mobile_no"],
                  },
                ],
              },
            ],
            order: [["createdAt", "DESC"]],
          });
        res.status(200).json({
            success: true,
            message: "Orders retrieved successfully",
            data: orders,
        });
    } catch (error) {
        logger.error("Error fetching orders:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving orders",
            error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
        });
    }
};

// Get customer's orders
exports.getCustomerOrders = async (req, res) => {
  try {
    const orders = await db.orders.findAll({
      where: { user_id: req.user.user_id },
      include: [
        {
          model: db.quotations,
          include: [
            {
              model: db.quotationItems,
              include: [{ model: db.products }],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Customer orders retrieved successfully",
      data: orders,
    });
  } catch (error) {
    logger.error("Error fetching customer orders:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

// Get single order details
exports.getOrderById = async (req, res) => {
  try {
    const { order_id } = req.params;
    const isSuperAdmin = req.user.role_id === 5;

    const order = await db.orders.findOne({
      where: {
        order_id,
        ...(!isSuperAdmin && { user_id: req.user.user_id }),
      },
      include: [
        {
          model: db.quotations,
          include: [
            {
              model: db.quotationItems,
              include: [{ model: db.products }],
            },
            {
              model: db.users,
              attributes: ["user_id", "name", "email", "mobile_no"],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    logger.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

// Update order status (superadmin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;

    // Check if user is superadmin
    if (req.user.role_id !== 5) {
      return res.status(403).json({
        success: false,
        message: "Only superadmin can update order status",
      });
    }

    // Validate status
    const validStatuses = ["placed", "shipped", "delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: placed, shipped, delivered",
      });
    }

    const order = await db.orders.findByPk(order_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await order.update({ status });

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: { status: order.status },
    });
  } catch (error) {
    logger.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};
