const db = require("../models");
const { Op } = require("sequelize");

// Get references to your models with correct names from the db object
const Order = db.orders; // lowercase plural as defined in index.js
const Ticket = db.tickets; // lowercase plural as defined in index.js
const Product = db.products; // lowercase plural as defined in index.js
const User = db.users; // lowercase plural as defined in index.js
const Quotation = db.quotations; // lowercase plural as defined in index.js

// Get stats for admin dashboard (resilient defaults)
exports.getDashboardStats = async (req, res) => {
  let totalOrders = 0;
  let totalTickets = 0;
  let totalProducts = 0;
  let totalRevenue = 0;
  let userCountsByRole = [];

  try {
    totalOrders = (await Order.count()) || 0;
  } catch (e) {
    console.error("Dashboard stats: Order.count failed:", e.message);
  }
  try {
    totalTickets = (await Ticket.count()) || 0;
  } catch (e) {
    console.error("Dashboard stats: Ticket.count failed:", e.message);
  }
  try {
    totalProducts = (await Product.count()) || 0;
  } catch (e) {
    console.error("Dashboard stats: Product.count failed:", e.message);
  }
  try {
    totalRevenue =
      (await Order.sum("total_amount", {
        where: { status: { [Op.ne]: "cancelled" } },
      })) || 0;
  } catch (e) {
    console.error("Dashboard stats: Order.sum failed:", e.message);
  }
  try {
    userCountsByRole =
      (await User.count({ attributes: ["role_id"], group: ["role_id"] })) || [];
  } catch (e) {
    console.error("Dashboard stats: User.count(group) failed:", e.message);
    userCountsByRole = [];
  }

  // Always return 200 with whatever we could fetch
  return res.json({
    totalOrders,
    totalTickets,
    totalProducts,
    totalRevenue,
    userCountsByRole,
  });
};

// Get ticket status distribution
exports.getTicketStats = async (req, res) => {
  try {
    const ticketStats = await Ticket.findAll({
      attributes: [
        "ticket_status",
        [db.sequelize.fn("COUNT", db.sequelize.col("ticket_id")), "count"],
      ],
      group: ["ticket_status"],
      raw: true,
    });
    return res.json(ticketStats);
  } catch (error) {
    console.error("Error fetching ticket stats:", error.message);
    // Return empty dataset instead of 500 to keep dashboard functional
    return res.json([]);
  }
};

// Get order status distribution
exports.getOrderStats = async (req, res) => {
  try {
    const orderStats = await Order.findAll({
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("order_id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });
    return res.json(orderStats);
  } catch (error) {
    console.error("Error fetching order stats:", error.message);
    return res.json([]);
  }
};

// Get quotation status distribution
exports.getQuotationStats = async (req, res) => {
  try {
    const quotationStats = await Quotation.findAll({
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("quotation_id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });
    return res.json(quotationStats);
  } catch (error) {
    console.error("Error fetching quotation stats:", error.message);
    return res.json([]);
  }
};

// Get monthly revenue for the past 6 months
exports.getRevenueByMonth = async (req, res) => {
  try {
    const today = new Date();
    const monthlyData = [];

    // Generate data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() - i + 1,
        0
      );

      const monthName = startDate.toLocaleString("default", { month: "short" });

      const revenue =
        (await Order.sum("total_amount", {
          where: {
            // Use underscored timestamp field as defined in the model/Sequelize config
            created_at: { [Op.between]: [startDate, endDate] },
            status: { [Op.ne]: "cancelled" },
          },
        })) || 0;

      monthlyData.push({
        month: monthName,
        revenue,
      });
    }

    res.json({
      monthlyData,
      totalRevenue: monthlyData.reduce((sum, item) => sum + item.revenue, 0),
    });
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    res
      .status(500)
      .json({ message: "Error fetching revenue data", error: error.message });
  }
};

// Get revenue data with time range options (daily, monthly, yearly)
exports.getRevenueByTimeRange = async (req, res) => {
  try {
    // Get query parameters with defaults
    const timeRange = req.query.timeRange || "monthly";
    const duration = parseInt(req.query.duration || "6");

    const today = new Date();
    const revenueData = [];
    let format;
    let title;
    let durationText;

    switch (timeRange) {
      case "daily":
        // Daily revenue for the past N days
        format = "MMM d"; // May 15
        title = "Daily Revenue";
        durationText = `${duration} days`;

        for (let i = duration - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);

          const startDate = new Date(date.setHours(0, 0, 0, 0));
          const endDate = new Date(date.setHours(23, 59, 59, 999));

          const dateLabel = date.toLocaleDateString("default", {
            month: "short",
            day: "numeric",
          });

          const revenue =
            (await Order.sum("total_amount", {
              where: {
                created_at: { [Op.between]: [startDate, endDate] },
                status: { [Op.ne]: "cancelled" },
              },
            })) || 0;

          revenueData.push({
            label: dateLabel,
            revenue,
          });
        }
        break;

      case "monthly":
        // Monthly revenue for the past N months
        format = "MMM yyyy"; // May 2023
        title = "Monthly Revenue";
        durationText = `${duration} months`;

        for (let i = duration - 1; i >= 0; i--) {
          const startDate = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
          );
          const endDate = new Date(
            today.getFullYear(),
            today.getMonth() - i + 1,
            0
          );

          const monthLabel = startDate.toLocaleDateString("default", {
            month: "short",
          });

          const revenue =
            (await Order.sum("total_amount", {
              where: {
                created_at: { [Op.between]: [startDate, endDate] },
                status: { [Op.ne]: "cancelled" },
              },
            })) || 0;

          revenueData.push({
            label: monthLabel,
            revenue,
          });
        }
        break;

      case "yearly":
        // Yearly revenue for the past N years
        format = "yyyy"; // 2023
        title = "Yearly Revenue";
        durationText = `${duration} years`;

        for (let i = duration - 1; i >= 0; i--) {
          const startDate = new Date(today.getFullYear() - i, 0, 1);
          const endDate = new Date(today.getFullYear() - i, 11, 31);

          const yearLabel = startDate.getFullYear().toString();

          let revenue = 0;
          try {
            revenue =
              (await Order.sum("total_amount", {
                where: {
                  created_at: { [Op.between]: [startDate, endDate] },
                  status: { [Op.ne]: "cancelled" },
                },
              })) || 0;
          } catch (e) {
            console.error("Revenue yearly sum failed:", e.message);
            revenue = 0;
          }

          revenueData.push({
            label: yearLabel,
            revenue,
          });
        }
        break;

      default:
        return res.status(400).json({
          message:
            "Invalid timeRange parameter. Use 'daily', 'monthly', or 'yearly'.",
        });
    }

    res.json({
      timeRange,
      duration,
      title,
      durationText,
      revenueData,
      totalRevenue: revenueData.reduce((sum, item) => sum + item.revenue, 0),
    });
  } catch (error) {
    console.error("Error fetching revenue data:", error.message);
    // Return a safe default payload so the dashboard renders
    return res.json({
      timeRange: req.query.timeRange || "monthly",
      duration: parseInt(req.query.duration || "6"),
      title: "Revenue",
      durationText: "",
      revenueData: [],
      totalRevenue: 0,
    });
  }
};
