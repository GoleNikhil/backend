const InvoiceService = require("../services/invoiceService");
const db = require("../models");
const logger = require("../utils/logger");
const moment = require("moment");
const path = require("path");
const fs = require("fs");

// Update the format in the getNextInvoiceId function
async function getNextInvoiceId() {
  try {
    // Format for current date in YYYYMMDD
    const currentDate = moment().format("YYYYMMDD");

    // Find the most recent invoice regardless of date
    const invoices = await db.invoices.findAll({
      where: {
        invoice_number: {
          [db.Sequelize.Op.like]: "INVAVNS%-%", // Match any date pattern
        },
      },
      order: [["createdAt", "DESC"]],
      limit: 1,
    });

    // Log for debugging
    logger.debug(`Found ${invoices.length} invoices in total`);

    if (invoices.length > 0) {
      logger.debug(`Latest invoice number: ${invoices[0].invoice_number}`);
    }

    // If no invoices found at all, start with 001
    if (invoices.length === 0) {
      return "001";
    }

    // Extract the current highest number regardless of date
    const latestInvoice = invoices[0].invoice_number;
    const parts = latestInvoice.split("-");

    if (parts.length !== 2) {
      logger.warn(`Unexpected invoice number format: ${latestInvoice}`);
      return "001";
    }

    const currentNumber = parseInt(parts[1], 10);

    // Increment and pad with zeros
    const nextNumber = (currentNumber + 1).toString().padStart(3, "0");
    logger.debug(
      `Next invoice number will be: INVAVNS${currentDate}-${nextNumber}`
    );

    return nextNumber;
  } catch (error) {
    logger.error(`Error getting next invoice ID: ${error.message}`, {
      stack: error.stack,
    });
    return "001"; // Fallback to 001 if there's an error
  }
}

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

exports.generateInvoice = async (req, res) => {
  const { order_id } = req.params;
  logger.info(`Starting invoice generation for order_id: ${order_id}`);

  try {
    // First check if invoice already exists for this order
    logger.debug(
      `Checking if invoice already exists for order_id: ${order_id}`
    );
    const existingInvoice = await db.invoices.findOne({
      where: { order_id },
    });

    // If invoice already exists, return it instead of creating a new one
    if (existingInvoice) {
      logger.info(
        `Invoice already exists for order_id: ${order_id}, returning existing invoice number: ${existingInvoice.invoice_number}`
      );
      return res.status(200).json({
        success: true,
        message: "Invoice found",
        data: {
          invoice_number: existingInvoice.invoice_number,
          download_url: `${BACKEND_BASE_URL}/api/invoices/invoices/${existingInvoice.invoice_number}/download`,
        },
      });
    }

    // Find order with all related data
    logger.debug(`Fetching order details for order_id: ${order_id}`);
    const order = await db.orders.findByPk(order_id, {
      include: [
        {
          model: db.quotations,
          include: [
            {
              model: db.users,
              attributes: ["name", "address"],
              include: [
                {
                  model: db.customers,
                  attributes: ["gst_no"],
                  required: false,
                },
                {
                  model: db.consultants,
                  attributes: ["gst_no"],
                  required: false,
                },
              ],
            },
            {
              model: db.quotationItems,
              include: [
                {
                  model: db.products,
                  attributes: ["product_name"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!order) {
      logger.warn(`Order not found for order_id: ${order_id}`);
      return res.status(404).json({ error: "Order not found" });
    }

    // Generate invoice number first
    const invoiceNumber = `INVAVNS${moment().format("YYYYMMDD")}-${await getNextInvoiceId()}`;
    logger.debug(`Generated invoice number: ${invoiceNumber}`);

    // Create invoice record with the generated number
    logger.debug(`Creating invoice record for order_id: ${order_id}`);
    const invoice = await db.invoices.create({
      order_id: order.order_id,
      total_amount: order.total_amount,
      invoice_number: invoiceNumber,
    });

    // Generate PDF
    logger.debug(`Generating PDF for invoice_id: ${invoice.invoice_id}`);
    await InvoiceService.generateInvoicePDF(order, invoice, "/temp");

    logger.info(
      `Successfully generated invoice ${invoiceNumber} for order_id: ${order_id}`
    );
    res.status(200).json({
      success: true,
      message: "Invoice generated successfully",
      data: {
        invoice_number: invoiceNumber,
        download_url: `${BACKEND_BASE_URL}/api/invoices/invoices/${invoiceNumber}/download`,
      },
    });
  } catch (error) {
    logger.error(
      `Error generating invoice for order_id ${order_id}: ${error.message}`,
      {
        stack: error.stack,
      }
    );
    res.status(500).json({ error: error.message });
  }
};

exports.downloadInvoice = async (req, res) => {
  const { invoiceNumber } = req.params;
  logger.info(`Starting invoice download for invoice: ${invoiceNumber}`);

  try {
    const filePath = path.join("/temp", `${invoiceNumber}.pdf`);
    logger.error(`Checking file existence at path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      logger.warn(`Invoice file not found: ${invoiceNumber}`);
      return res.status(404).json({ error: "Invoice not found" });
    }

    logger.info(`Initiating download for invoice: ${invoiceNumber}`);
    res.download(filePath);
  } catch (error) {
    logger.error(
      `Error downloading invoice ${invoiceNumber}: ${error.message}`,
      {
        stack: error.stack,
      }
    );
    res.status(500).json({ error: error.message });
  }
};

exports.viewInvoice = async (req, res) => {
  const { invoiceNumber } = req.params;
  logger.info(`Starting invoice view for invoice: ${invoiceNumber}`);

  try {
    const filePath = path.join("/temp", `${invoiceNumber}.pdf`);
    logger.debug(`Checking file existence at path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      logger.warn(`Invoice file not found: ${invoiceNumber}`);
      return res.status(404).json({ error: "Invoice not found" });
    }

    logger.debug(`Streaming PDF file: ${invoiceNumber}`);
    const file = fs.createReadStream(filePath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${invoiceNumber}.pdf`
    );
    file.pipe(res);

    logger.info(`Successfully streamed invoice: ${invoiceNumber}`);
  } catch (error) {
    logger.error(`Error viewing invoice ${invoiceNumber}: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ error: error.message });
  }
};
