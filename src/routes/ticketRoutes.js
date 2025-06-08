// routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const authenticate = require("../middleware/authMiddleware");
const db = require("../models");
const logger = require("../utils/logger");
const { checkPermission } = require("../middleware/checkPermission");
// Create a new ticket (requires authentication).
router.post("/", authenticate, ticketController.createTicket);

// Update a ticket's status (e.g., to "resolved").
router.patch("/:ticket_id", ticketController.updateTicketStatus);

// Get all tickets for the authenticated user.
router.get("/", authenticate, ticketController.getTickets);

// Accept a ticket (freelancer only)
router.patch("/:ticket_id/accept", authenticate, ticketController.acceptTicket);

// Get available tickets (freelancer only)
router.get("/available", authenticate, ticketController.getAvailableTickets);

// New routes needed for freelancer
router.get("/active", authenticate, ticketController.getActiveTickets);
router.get("/stats", authenticate, ticketController.getFreelancerStats);

// Cancel a ticket
router.patch("/:ticket_id/cancel", authenticate, ticketController.cancelTicket);

// Get ticket history (freelancer only)
router.get("/history", authenticate, ticketController.getFreelancerHistory);

// Add these new admin routes
// Get tickets that need admin review
router.get(
  "/pending-admin-review",
  authenticate,
  ticketController.getPendingAdminReviewTickets
);

// Admin finalizes a ticket and deducts calls
router.post(
  "/:ticket_id/finalize",
  authenticate,
  ticketController.adminFinalizeTicket
);

// Get all tickets for admin with optional filtering
router.get("/admin", authenticate, ticketController.getAllTicketsForAdmin);

module.exports = router;
