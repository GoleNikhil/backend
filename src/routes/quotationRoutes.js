const express = require("express");
const router = express.Router();
const quotationController = require("../controllers/quotationController");
const authenticate = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/checkPermission");

// Customer Routes
router.get("/AddtoQuotation", authenticate,quotationController.getQuotationForm); // Add product to quotation form
router.post("/", authenticate, quotationController.createQuotation); // Create a new quotation from cart
router.get("/admin", authenticate, quotationController.getAllQuotationsForAdmin); // Get all quotations for a user
router.get("/:quotation_id", authenticate, quotationController.getQuotation); // Get details of a specific quotation
router.get("/", authenticate, quotationController.getAllQuotations); // Get all quotations for a user
router.put("/negotiate/:quotation_id", authenticate, quotationController.customerNegotiation); // Customer negotiation
router.put("/finalDecision/:quotation_id", authenticate, quotationController.customerFinalDecision); // Customer final decision
router.delete("/delete/:quotation_id", authenticate, quotationController.deleteQuotation);

// Admin Routes
router.put("/review/:quotation_id", authenticate,  quotationController.adminReviewQuotation); // Admin reviews quotation and sets prices
router.post("/decision/:quotation_id", authenticate, quotationController.finalAdminDecision); // Admin final decision (approve/decline)

module.exports = router;