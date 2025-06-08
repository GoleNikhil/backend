const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const logger = require("../utils/logger");
const db = require("../models");
const numberToWords = require("number-to-words");

class InvoiceService {
  static async generateInvoicePDF(order, invoice, outputPath) {
    const startTime = Date.now();

    logger.info(`Starting PDF generation for order_id: ${order.order_id}`);

    try {
      const doc = new PDFDocument();

      // Function to add border to every page
      const addPageBorder = () => {
        doc.strokeColor("black").lineWidth(1).rect(30, 40, 550, 710).stroke();
      };

      // Add event listener for new pages
      doc.on("pageAdded", () => {
        addPageBorder();
      });

      // Add border for the first page
      addPageBorder();
      const filePath = path.join(outputPath, `${invoice.invoice_number}.pdf`);

      console.log(
        `Creating PDF document with invoice number: ${invoice.invoice_number} at path: ${filePath}` // Added filePath to log
      );
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }

      // Create write stream
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Add content
      logger.debug("Adding static content to PDF");
      await this.addStaticContent(doc);

      logger.debug("Adding dynamic content to PDF");
      await this.addDynamicContent(doc, order, invoice, invoice.invoice_number);

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const duration = Date.now() - startTime;
      logger.info(
        `PDF generation completed for invoice ${invoice.invoice_number} in ${duration}ms`
      );

      return true;
    } catch (error) {
      logger.error(
        `Error generating PDF for order ${order.order_id}: ${error.message}`,
        {
          stack: error.stack,
        }
      );
      throw error;
    }
  }

  static async addStaticContent(doc) {
    try {
      // Company logo
      doc.image("src/invoices/logo.png", 50, 80, { width: 140 });

      // Company details
      // Company details (Each line separately)
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("AVNS TECHNOSOFT", 210, 50, { align: "left" });

      doc.font("Helvetica").fontSize(9);
      doc.text("Address:-Office No 236, 2nd Floor, Vision9", 210, 70);
      doc.text("Kunal Icon Road, Pimple Saudagar", 210, 80);
      doc.text("Pune, Maharashtra 411027 India", 210, 90);
      doc.text("GST No.: 27BDUPG0727Q1ZV", 210, 100);
      doc.text("Email: accounts@avnstechnosoft.com", 210, 110);
      doc.text("Website: avnstechnosoft.com", 210, 120);
      doc.text("Phone: 8237165766", 210, 130);

      // TAX INVOICE box
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("TAX INVOICE", 420, 110, { align: "right" });

      // Reset color
      doc.fillColor("black");

      // Define grid dimensions
      const gridTop = 150; // starting Y position
      const gridLeft = 30; // starting X position
      const gridWidth = 550; // total grid width
      const gridHeight = 175; // total grid height

      // Draw the outer border for the grid
      doc
        .strokeColor("black")
        .lineWidth(0.5)
        .rect(gridLeft, gridTop, gridWidth, gridHeight)
        .stroke();

      // Draw vertical line to split into 2 columns
      doc
        .moveTo(gridLeft + gridWidth / 2, gridTop)
        .lineTo(gridLeft + gridWidth / 2, gridTop + gridHeight)
        .stroke();

      // Draw horizontal line to split into 2 rows - Moved higher to make bottom sections taller
      const topRowHeight = 70; // Reduced from previous 87.5 (which was gridHeight / 2)
      doc
        .moveTo(gridLeft, gridTop + topRowHeight)
        .lineTo(gridLeft + gridWidth, gridTop + topRowHeight)
        .stroke();

      // Static "Place of Supply"
      doc
        .font("Helvetica")
        .fontSize(10)
        .text("Place of Supply: Maharashtra (27)", 320, 160, { align: "left" });
    } catch (error) {
      logger.error(`Error adding static content: ${error.message}`);
      throw error;
    }
  }

  static async addDynamicContent(doc, order, invoice, invoiceNumber) {
    try {
      const startY = 160;

      const columnX1 = 50; // Bill To (Left)
      const columnX2 = 320; // Ship To (Right)
      const textWidth = 250; // Maximum width for text wrapping
      let billToY = startY + 70; // Position now based on top row height instead of fixed value

      // Invoice details (Box 1)
      doc
        .fontSize(10)
        .text(`Invoice Number: ${invoiceNumber}`, columnX1, startY)
        .text(
          `Invoice Date: ${moment(invoice.invoice_date).format("DD/MM/YYYY")}`,
          columnX1,
          startY + 15
        )
        .text(`Terms: Net 15`, columnX1, startY + 30)
        .text(
          `Due Date: ${moment(invoice.invoice_date).add(15, "days").format("DD/MM/YYYY")}`,
          columnX1,
          startY + 45
        );

      // Customer details (Box 3 - Bill To)
      const customer = await db.users.findByPk(order.user_id, {
        include: [
          {
            model: db.customers,
            as: "Customer",
            attributes: ["gst_no"],
            required: false,
          },
          {
            model: db.consultants,
            as: "Consultant",
            attributes: ["gst_no"],
            required: false,
          },
        ],
      });

      if (!customer) throw new Error("Customer not found");

      // Determine correct GST number
      const gstNumber =
        customer.Customer?.gst_no || customer.Consultant?.gst_no || "N/A";

      console.log("Fetched Customer Data:", JSON.stringify(customer, null, 2));
      console.log("Customer GST Details:", customer.customers);

      doc.fontSize(10).text("Bill To:", columnX1, billToY);
      billToY += 15; // Move down for content

      // Customer Name
      doc.text(customer.name, columnX1, billToY, {
        width: textWidth,
        lineGap: 5, // Reduced line gap for more compact text
      });
      billToY += 15; // Move down after name

      // Address Wrapping - Make sure it renders completely before GST
      doc.text(customer.address, columnX1, billToY, {
        width: textWidth,
        lineGap: 5, // Reduced line gap for more compact text
      });

      // Get the height that was actually used to render the address
      const addressHeight = doc.heightOfString(customer.address, {
        width: textWidth,
        lineGap: 5, // Use the same line gap as above
      });
      billToY += addressHeight; // Move exactly to the end of the address with no extra gap

      // GSTIN (Placed immediately after address)
      doc.text(`GSTIN: ${gstNumber}`, columnX1, billToY);

      // Ship To (Box 4, Same as Bill To but without name)
      let shipToY = startY + 70; // Start at the same position as Bill To

      doc.fontSize(10).text("Ship To:", columnX2, shipToY);
      shipToY += 15; // Move down for content

      // Address Wrapping for Ship To - Make sure it renders completely
      doc.text(customer.address, columnX2, shipToY, {
        width: textWidth,
        lineGap: 5, // Reduced line gap for more compact text
      });

      // Get the height that was actually used to render the address
      const shipAddressHeight = doc.heightOfString(customer.address, {
        width: textWidth,
        lineGap: 5, // Use the same line gap as above
      });
      shipToY += shipAddressHeight; // Move exactly to the end of the address with no extra gap

      // GSTIN for Ship To
      doc.text(`GSTIN: ${gstNumber}`, columnX2, shipToY);
    } catch (error) {
      logger.error(`Error adding dynamic content: ${error.message}`);
      throw error;
    }

    // Items table (below grid section)
    const startY = 160;
    const tableTop = startY + 200; // Adjusted to be below the grid
    const tableHeaders = [
      "Sr No",
      "Item Name",
      "HSN/SAC",
      "Qty",
      "Rate",
      "GST %",
      "Amount",
    ];
    const columnWidths = [45, 160, 65, 45, 65, 55, 85];
    let xPosition = 50;

    // Draw table headers with padding
    tableHeaders.forEach((header, i) => {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(header, xPosition + 5, tableTop);
      xPosition += columnWidths[i];
    });

    // Add table lines
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

    // Draw horizontal lines
    doc
      .moveTo(50, tableTop - 5)
      .lineTo(50 + totalWidth, tableTop - 5)
      .stroke(); // Top line

    doc
      .moveTo(50, tableTop + 20)
      .lineTo(50 + totalWidth, tableTop + 20)
      .stroke(); // Below headers

    // Draw vertical lines
    let x = 50;
    columnWidths.forEach((width) => {
      doc
        .moveTo(x, tableTop - 5)
        .lineTo(x, tableTop + 20)
        .stroke();
      x += width;
    });
    // Draw final vertical line
    doc
      .moveTo(x, tableTop - 5)
      .lineTo(x, tableTop + 20)
      .stroke();

    // Draw table content
    let yPosition = tableTop + 25;
    const quotationItems = await db.quotationItems.findAll({
      where: { quotation_id: order.quotation_id },
      include: [
        {
          model: db.products,
          attributes: ["product_id", "product_name", "HSN_no"],
        },
      ],
    });

    quotationItems.forEach((item, index) => {
      xPosition = 50;
      doc
        .fontSize(9)
        .font("Helvetica")
        .text((index + 1).toString(), xPosition + 5, yPosition);
      xPosition += columnWidths[0];

      doc.text(item.Product.product_name, xPosition + 5, yPosition, {
        width: columnWidths[1] - 10,
        ellipsis: true,
      });
      xPosition += columnWidths[1];

      doc.text(item.Product.HSN_no || "-", xPosition + 5, yPosition);
      xPosition += columnWidths[2];

      doc.text(item.quantity.toString(), xPosition + 5, yPosition);
      xPosition += columnWidths[3];

      doc.text(item.final_price.toString(), xPosition + 5, yPosition);
      xPosition += columnWidths[4];

      doc.text(`${item.gst_percentage}%`, xPosition + 5, yPosition);
      xPosition += columnWidths[5];

      doc.text(`${item.grand_total_price}`, xPosition + 5, yPosition, {
        width: columnWidths[6] - 10,
        align: "right",
      });

      // Draw horizontal line below each row
      doc
        .moveTo(50, yPosition + 15)
        .lineTo(50 + totalWidth, yPosition + 15)
        .stroke();

      // Draw vertical lines for each row
      let lineX = 50;
      columnWidths.forEach((width) => {
        doc
          .moveTo(lineX, yPosition - 5)
          .lineTo(lineX, yPosition + 15)
          .stroke();
        lineX += width;
      });
      // Draw final vertical line
      doc
        .moveTo(lineX, yPosition - 5)
        .lineTo(lineX, yPosition + 15)
        .stroke();

      yPosition += 20; // Move to the next row
    });

    // Total Section (Fetching directly from order table)
    const totalInWords =
      numberToWords.toWords(order.total_amount).toUpperCase() + " ONLY";
    const totalY = yPosition + 20;

    // Continue the table border for total section
    const totalBoxWidth = columnWidths[5] + columnWidths[6]; // Width of last 2 columns
    const totalBoxX =
      50 + columnWidths.slice(0, 5).reduce((sum, width) => sum + width, 0);

    // Draw box connecting to table with more height
    doc
      .moveTo(totalBoxX, yPosition - 5)
      .lineTo(totalBoxX + totalBoxWidth, yPosition - 5)
      .lineTo(totalBoxX + totalBoxWidth, yPosition + 140) // Increased to 160
      .lineTo(totalBoxX, yPosition + 140) // Increased to 160
      .lineTo(totalBoxX, yPosition - 5)
      .stroke();

    // Add total text (same as before)
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Total:", totalBoxX + 10, totalY);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${order.total_amount}`, totalBoxX + 10, totalY, {
        width: totalBoxWidth - 20,
        align: "right",
      });

    // Add separator line (same position)
    doc
      .moveTo(totalBoxX, totalY + 25)
      .lineTo(totalBoxX + totalBoxWidth, totalY + 25)
      .stroke();

    // Signature with natural dimensions
    doc.image("src/invoices/signature_stamp.jpg", totalBoxX + 15, totalY + 35, {
      width: totalBoxWidth - 30,
    });

    // Total in Words - Left Side (keeping as is)
    doc.fontSize(10).font("Helvetica").text("Total in Words:", 50, totalY);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(totalInWords, 50, totalY + 15);

    // Keep original declaration Y position
    const declarationY = totalY + 40;

    // Declaration Section
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Declaration:", 50, declarationY);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(
        "We hereby confirm that hardware or software supplied vide\n" +
          "this invoice is acquired in a subsequent transfer and it is \n" +
          "transferred without any modification and tax has been deducted under\n" +
          "section 195 deposited under PAN NO: BDUPG0727Q by the PAN holder. \n" +
          "Hence no TDS is deducted on this invoice as per the notification\n" +
          "no: 21/2012 [F. No 142/10/2012-SO 1323 (E), dated 13-06-2012]  \n" +
          "issued by theMinistry of Finance (CBDT). Cheque should be made by  \n" +
          "the name of AVNS TECHNOSOFT by the buyer.",
        50,
        declarationY + 15,
        { width: 500 } // Ensuring it wraps within a proper width
      );

    // Helper function to check remaining height on the current page
    const remainingHeight = (y) => {
      // Page height minus margin and a small buffer (710 is from the border definition)
      return 710 - y;
    };

    // Positioning below Declaration section
    let bankDetailsY = declarationY + 120; // Initial position

    // Bank Account Details Section - always start right after declaration
    // If we're close to the end of the page, it will naturally flow to the next page
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("BANK ACCOUNT DETAILS:", 50, bankDetailsY);

    const bankDetailsText =
      "Name of Account  : AVNS TECHNOSOFT\n" +
      "Name of Bank     : HDFC Bank Ltd.\n" +
      "Bank Account No. : 50200046575231\n" +
      "RTGS/NEFT/IFSC   : HDFC0003981\n" +
      "MICR Code        : 411240052\n" +
      "Account Type     : Current A/c\n" +
      "Branch Name      : Aundh 2\n" +
      "Branch Address   : Nagras Tower, Building A, Shop No. 2, S. No.\n" +
      "162-4A/5A, Naras Road Aundh.";

    // Allow the bank details to flow naturally to the next page if needed
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(
        bankDetailsText,
        50,
        bankDetailsY + 15,
        { width: 500, continued: false } // Allow text to flow naturally across pages
      );

    // Get current Y position after bank details
    const currentY = doc.y + 20; // Add some spacing after bank details

    // Terms & Conditions text
    const termsConditionsText = `Terms & Conditions:
1. Terms of Payment: 100% Advance along with the PO.
2. We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
3. We hereby confirm that Hardware or Software supplied in this invoice is sold without any modification.
4. The Company has already deducted TDS under section 194J of the Income Tax on these software & hardware and made necessary arrangements for remitting the same as per the prescribed timeline.
5. Software License: License will be delivered within 3 to 5 working days. License key and certificate will be delivered electronically via email.
6. PAN of the company is BDUPG0727Q.
7. Payment should be made strictly as per terms mentioned.
8. Our responsibility ceases on delivery of goods to customers.
9. Goods once sold will not be taken back.
10. Interest 24% PA will be charged from the date of invoice for delayed payment.`;

    // Calculate height needed for terms and conditions
    const termsHeight =
      doc.heightOfString(termsConditionsText, { width: 500 }) + 20;

    // If there's not enough space for even a portion of terms on this page,
    // and we're already on a new page (after bank details), go to the next page
    if (remainingHeight(currentY) < 50 && doc.y > 100) {
      // 50 is minimal reasonable space, y > 100 means we're not at page start
      doc.addPage();
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(termsConditionsText, 50, 60, { width: 500 });
    } else {
      // Otherwise just continue on the current page/position
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(termsConditionsText, 50, currentY, { width: 500 });
    }
  }
}

module.exports = InvoiceService;
