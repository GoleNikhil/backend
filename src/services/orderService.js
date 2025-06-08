const db = require("../models");
const logger = require("../utils/logger");

exports.createOrderFromQuotation = async (quotation, t) => {
  try {
    // Log incoming quotation object
    console.log(`createOrderFromQuotation called with quotation:`, quotation);

    // Check if user_id exists
    if (!quotation.user_id) {
      throw new Error("Quotation missing user_id");
    }

    // Fetch all quotation items with grand_total_price (using the transaction)
    const quotationItems = await db.quotationItems.findAll({
      where: {
        quotation_id: quotation.quotation_id,
        grand_total_price: {
          [db.Sequelize.Op.ne]: null,
        },
      },
      attributes: ["grand_total_price"],
      transaction: t,
    });

    console.log(`Found ${quotationItems.length} finalized quotation items`);

    if (!quotationItems.length) {
      throw new Error("No finalized quotation items found");
    }

    // Calculate total order amount from grand_total_prices
    const total_amount = quotationItems.reduce((sum, item) => {
      return sum + parseFloat(item.grand_total_price);
    }, 0);

    // Log total_amount before creation
    console.log(`Calculated total_amount: ${total_amount}`);

    // Format total_amount as string with 2 decimals (better for DECIMAL field)
    const total_amount_str = total_amount.toFixed(2);

    // Log order creation data
    console.log(`Creating order with data:`, {
      quotation_id: quotation.quotation_id,
      user_id: quotation.user_id,
      status: "placed",
      total_amount: total_amount_str,
    });

    // Create new order within the transaction
    const order = await db.orders.create(
      {
        quotation_id: quotation.quotation_id,
        user_id: quotation.user_id,
        status: "placed",
        total_amount: total_amount_str,
      },
      { transaction: t }
    );

    console.log(
      `Order created for quotation ${quotation.quotation_id} with total ${total_amount_str}`
    );
    return order;
  } catch (error) {
    // Log full error for debugging
console.error(`Error creating order from quotation:`, error);
    throw error;
  }
};
  