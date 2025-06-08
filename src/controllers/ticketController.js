const logger = require("../utils/logger");
const ticketService = require("../services/ticketService");
const db = require("../models");
const Freelancer = db.freelancers;

exports.createTicket = async (req, res, next) => {
  logger.info("createTicket function called");
  try {
    const user_id = req.user.user_id;
    const { subscription_id, ticket_description, skill_id } = req.body;
    const ticket = await ticketService.createTicket(
      user_id,
      subscription_id,
      ticket_description,
      skill_id
    );
    logger.info("createTicket function executed successfully");
    res.status(201).json(ticket);
  } catch (error) {
    logger.error("Error creating ticket: %o", error);
    next(error);
  }
};

exports.updateTicketStatus = async (req, res, next) => {
  logger.info("updateTicketStatus function called");
  try {
    const ticket_id = req.params.ticket_id;
    const { ticket_status, freelancer_note } = req.body;

    // Add validation for status
    if (
      !["resolved", "unresolved", "pending_admin_review"].includes(
        ticket_status.toLowerCase()
      )
    ) {
      const error = new Error(
        "Status must be either 'resolved', 'unresolved', or 'pending_admin_review'"
      );
      error.statusCode = 400;
      logger.warn("Invalid ticket status: %s", ticket_status);
      return next(error);
    }

    // Now we also pass the note
    const updatedTicket = await ticketService.updateTicketStatus(
      ticket_id,
      ticket_status.toLowerCase(),
      freelancer_note
    );

    logger.info("updateTicketStatus function executed successfully");
    res.status(200).json(updatedTicket);
  } catch (error) {
    logger.error("Error updating ticket status: %o", error);
    next(error);
  }
};

// Add a new admin finalize endpoint
exports.adminFinalizeTicket = async (req, res, next) => {
  logger.info("adminFinalizeTicket function called");
  try {
    const user_id = req.user.user_id;

    // Get user to check role
    const user = await db.users.findOne({
      where: { user_id },
      attributes: ["role_id"],
    });

    // Check if user is admin
    if (!user || user.role_id !== 5) {
      const error = new Error("Only administrators can perform this action");
      error.statusCode = 403;
      logger.warn(
        "Unauthorized ticket finalization attempt by user_id: %s",
        user_id
      );
      return next(error);
    }

    const ticket_id = req.params.ticket_id;
    const { calls_to_deduct } = req.body;

    // Validate calls to deduct
    if (
      !calls_to_deduct ||
      isNaN(parseInt(calls_to_deduct)) ||
      parseInt(calls_to_deduct) <= 0
    ) {
      const error = new Error(
        "Valid number of calls to deduct must be provided"
      );
      error.statusCode = 400;
      return next(error);
    }

    const finalizedTicket = await ticketService.adminFinalizeTicket(
      ticket_id,
      parseInt(calls_to_deduct)
    );

    logger.info("adminFinalizeTicket function executed successfully");
    res.status(200).json(finalizedTicket);
  } catch (error) {
    logger.error("Error finalizing ticket: %o", error);
    next(error);
  }
};

// Add endpoint to get tickets that need admin review
exports.getPendingAdminReviewTickets = async (req, res, next) => {
  logger.info("getPendingAdminReviewTickets function called");
  try {
    const user_id = req.user.user_id;

    // Get user to check role
    const user = await db.users.findOne({
      where: { user_id },
      attributes: ["role_id"],
    });

    // Check if user is admin (assuming role_id 5 is admin, adjust as needed for your system)
    if (!user || user.role_id !== 5) {
      const error = new Error("Only administrators can access this resource");
      error.statusCode = 403;
      logger.warn("Unauthorized access attempt by user_id: %s", user_id);
      return next(error);
    }

    const tickets = await ticketService.getPendingAdminReviewTickets();
    logger.info("getPendingAdminReviewTickets function executed successfully");
    res.status(200).json(tickets);
  } catch (error) {
    logger.error("Error getting pending admin review tickets: %o", error);
    next(error);
  }
};

// get tickets by user_id
// This function retrieves all tickets associated with a user's subscriptions.
exports.getTickets = async (req, res, next) => {
  logger.info("getTickets function called");
  try {
    const user_id = req.user.user_id;

    const tickets = await ticketService.getTicketsByUser(user_id);
    logger.info("getTickets function executed successfully");
    res.status(200).json(tickets);
  } catch (error) {
    logger.error("Error getting tickets: %o", error);
    next(error);
  }
};
// get tickets by freelancer_id
// This function retrieves all tickets associated with a freelancer's subscriptions.
exports.acceptTicket = async (req, res, next) => {
  logger.info("acceptTicket function called");
  try {
    const user_id = req.user.user_id; // from JWT token

    // Get freelancer details using user_id
    const freelancer = await Freelancer.findOne({
      where: { user_id: user_id },
      attributes: ["freelancer_id"],
    });
    if (!freelancer) {
      const error = new Error("Only freelancers can accept tickets");
      error.statusCode = 403;
      logger.warn("Freelancer not found for user_id: %s", user_id);
      return next(error);
    }

    const { ticket_id } = req.params;
    const ticket = await ticketService.acceptTicket(
      ticket_id,
      freelancer.freelancer_id
    );

    logger.info("acceptTicket function executed successfully");
    res.status(200).json(ticket);
  } catch (error) {
    logger.error("Error accepting ticket: %o", error);
    next(error);
  }
};
// This function retrieves all available tickets for freelancers.
exports.getAvailableTickets = async (req, res, next) => {
  logger.info("getAvailableTickets function called");
  try {
    const user_id = req.user.user_id; // from JWT token

    // Get freelancer details using user_id (same as acceptTicket)
    const freelancer = await Freelancer.findOne({
      where: { user_id: user_id },
      attributes: ["freelancer_id"],
    });

    if (!freelancer) {
      const error = new Error("Only freelancers can view available tickets");
      error.statusCode = 403;
      logger.warn("Freelancer not found for user_id: %s", user_id);
      return next(error);
    }

    const tickets = await ticketService.getTicketsForFreelancer(
      freelancer.freelancer_id
    );

    logger.info("getAvailableTickets function executed successfully");
    res.status(200).json(tickets);
  } catch (error) {
    logger.error("Error getting available tickets: %o", error);
    next(error);
  }
};

exports.cancelTicket = async (req, res, next) => {
  logger.info("cancelTicket function called");
  try {
    const user_id = req.user.user_id; // Attached by authMiddleware
    const { ticket_id } = req.params;
    const ticket = await ticketService.cancelTicket(ticket_id, user_id);
    logger.info("cancelTicket function executed successfully");
    res.status(200).json(ticket);
  } catch (error) {
    logger.error("Error canceling ticket: %o", error);
    next(error);
  }
};

exports.getActiveTickets = async (req, res) => {
  try {
    // Get user_id from authenticated user
    const user_id = req.user.user_id;

    // First get the freelancer record
    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      logger.error(`No freelancer found for user_id: ${user_id}`);
      return res.status(404).json({
        message: "Freelancer profile not found",
      });
    }

    logger.info(
      `Fetching active tickets for freelancer_id: ${freelancer.freelancer_id}`
    );

    const tickets = await ticketService.getActiveTicketsByFreelancer(
      freelancer.freelancer_id
    );
    res.json(tickets);
  } catch (error) {
    logger.error("Error in getActiveTickets:", error);
    res.status(500).json({
      message: "Error fetching active tickets",
      error: error.message,
    });
  }
};

exports.getTicketHistory = async (req, res) => {
  try {
    // Get freelancer_id from the authenticated user
    const user_id = req.user.user_id;

    // Find the freelancer record
    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      return res.status(404).json({
        message: "Freelancer profile not found",
      });
    }

    // Get completed/resolved tickets
    const tickets = await db.tickets.findAll({
      where: {
        assigned_freelancer_id: freelancer.freelancer_id,
        ticket_status: {
          [db.Sequelize.Op.in]: ["resolved", "cancelled"],
        },
      },
      include: [
        {
          model: db.subscriptions,
          include: [
            {
              model: db.users,
              attributes: ["name", "mobile_no"],
            },
          ],
        },
        {
          model: db.skills,
          attributes: ["skill_name"],
        },
      ],
      order: [["resolved_at", "DESC"]],
      attributes: [
        "ticket_id",
        "ticket_description",
        "ticket_status",
        "resolved_at",
        "accepted_at",
        "created_at",
      ],
    });

    res.json(tickets);
  } catch (error) {
    console.error("Error fetching ticket history:", error);
    res.status(500).json({
      message: "Error fetching ticket history",
      error: error.message,
    });
  }
};

exports.getFreelancerStats = async (req, res) => {
  try {
    const freelancer_id = req.user.freelancer_id;
    const stats = await ticketService.getFreelancerStats(freelancer_id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add this to ticketController.js
// Get all tickets for admin with optional status filtering
exports.getAllTicketsForAdmin = async (req, res, next) => {
  logger.info("getAllTicketsForAdmin function called");
  try {
    const user_id = req.user.user_id;

    // Get user to check role
    const user = await db.users.findOne({
      where: { user_id },
      attributes: ["role_id"],
    });

    // Check if user is admin
    if (!user || user.role_id !== 5) {
      const error = new Error("Only administrators can access this resource");
      error.statusCode = 403;
      logger.warn("Unauthorized access attempt by user_id: %s", user_id);
      return next(error);
    }

    // Get status filter from query parameter if provided
    const statusFilter = req.query.status;

    const tickets = await ticketService.getAllTicketsForAdmin(statusFilter);
    logger.info("getAllTicketsForAdmin function executed successfully");
    res.status(200).json(tickets);
  } catch (error) {
    logger.error("Error getting tickets for admin: %o", error);
    next(error);
  }
};

// Add this new method to your existing controller
exports.getFreelancerHistory = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get freelancer record
    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    // Get all tickets that are not "open" or "inProgress"
    // This will include: resolved, unresolved, pending_admin_review, cancelled
    const tickets = await db.tickets.findAll({
      where: {
        assigned_freelancer_id: freelancer.freelancer_id,
        ticket_status: {
          [db.Sequelize.Op.in]: [
            "resolved",
            "unresolved",
            "pending_admin_review",
          ],
        },
      },
      include: [
        {
          model: db.subscriptions,
          include: [
            {
              model: db.users,
              attributes: ["name", "mobile_no", "address"],
            },
          ],
        },
        {
          model: db.skills,
          attributes: ["skill_name"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.json(tickets);
  } catch (error) {
    logger.error("Error fetching ticket history:", error);
    res.status(500).json({
      message: "Error fetching ticket history",
      error: error.message,
    });
  }
};

