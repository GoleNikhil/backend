const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { checkPermission } = require("../middleware/checkPermission");
const authenticate = require("../middleware/authMiddleware");

// Generate invoice
router.post('/orders/:order_id/invoice', invoiceController.generateInvoice);

// Download invoice
router.get('/invoices/:invoiceNumber/download', invoiceController.downloadInvoice);

// View invoice
router.get('/invoices/:invoiceNumber/view', invoiceController.viewInvoice);

module.exports = router;