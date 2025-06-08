const db = require("../models");
const { id } = require("../validations/validateSkillSchema");
const subscriptionService = require("./subscriptionService");
const { Op } = require("sequelize");
const sequelize = db.sequelize;
const Ticket = db.tickets;
const Subscription = db.subscriptions;
const FreelancerSkill = db.freelancerSkills;
const logger = require("../utils/logger"); // Import logger
const notificationService = require("./notificationService");
//ability to cancel ticket even after being accepted by an freelancer
//what happens to ticket if it isnt accepted by a freelancer

exports.createTicket = async (
  user_id,
  subscription_id,
  ticket_description,
  skill_id
) => {
  logger.info("createTicket function called");
  try {
    const subscription = await Subscription.findOne({
      where: { subscription_id, user_id },
    });
    if (!subscription) {
      throw new Error("Subscription not found for the user");
    }

    const subscriptionStatus =
      await subscriptionService.getActiveSubscription(user_id);
    if (
      !subscriptionStatus.status.isActive ||
      subscriptionStatus.status.remainingCalls === 0
    ) {
      throw new Error("No active subscription found or no remaining calls");
    }

    // Create a new ticket (calls are not decremented immediately).
    const ticket = await Ticket.create({
      subscription_id,
      ticket_description,
      ticket_status: "open",
      isCharged: false,
      skill_id: skill_id || null,
    });

    logger.info("Ticket created successfully");
    await notificationService.notifyFreelancerOfNewTicket(ticket);
    return ticket;
  } catch (error) {
    logger.error("Error creating ticket: %o", error);
    throw error;
  }
};

// Modify the existing updateTicketStatus function
exports.updateTicketStatus = async (
  ticket_id,
  newStatus,
  freelancer_note = null
) => {
  logger.info("updateTicketStatus function called");
  try {
    const ticket = await Ticket.findByPk(ticket_id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Save freelancer note if provided
    if (freelancer_note !== null) {
      ticket.freelancer_note = freelancer_note;
    }

    // If status is "resolved", change to pending_admin_review
    if (newStatus === "resolved") {
      ticket.ticket_status = "pending_admin_review";
      logger.info("Ticket status changed to pending_admin_review");
    } else {
      ticket.ticket_status = newStatus;
    }

    if (newStatus === "unresolved") {
      ticket.resolved_at = null; // Clear resolution date for unresolved tickets
    }

    await ticket.save();
    logger.info("Ticket status updated successfully");
    return ticket;
  } catch (error) {
    logger.error("Error updating ticket status: %o", error);
    throw error;
  }
};

exports.getTicketsByUser = async (user_id) => {
  logger.info("getTicketsByUser function called");
  try {
    // Retrieve all subscriptions for the user.
    const subscriptions = await Subscription.findAll({
      where: { user_id },
    });
    const subscriptionIds = subscriptions.map((sub) => sub.subscription_id);

    // Retrieve all tickets for these subscriptions.
    const tickets = await Ticket.findAll({
      where: {
        subscription_id: subscriptionIds,
      },
    });

    logger.info("Tickets retrieved successfully");
    return tickets;
  } catch (error) {
    logger.error("Error getting tickets by user: %o", error);
    throw error;
  }
};

exports.acceptTicket = async (ticket_id, freelancer_id) => {
  logger.info("acceptTicket function called");
  try {
    return await sequelize.transaction(async (t) => {
      // Find the ticket with a lock to prevent race conditions
      const ticket = await Ticket.findOne({
        where: {
          ticket_id,
          ticket_status: "open",
          assigned_freelancer_id: null,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!ticket) {
        throw new Error("Ticket not available for acceptance");
      }
      // Set the freelancer and update status
      ticket.assigned_freelancer_id = freelancer_id;
      ticket.ticket_status = "inProgress";
      ticket.accepted_at = new Date();

      await ticket.save({ transaction: t });
      logger.info("Ticket accepted successfully");
      return ticket;
    });
  } catch (error) {
    logger.error("Error accepting ticket: %o", error);
    throw error;
  }
};

exports.getTicketsForFreelancer = async (freelancer_id) => {
  logger.info("getTicketsForFreelancer function called");
  try {
    // First get the skills of the freelancer
    const freelancerSkills = await FreelancerSkill.findAll({
      where: { freelancer_id },
      attributes: ["skill_id"],
    });

    const skillIds = freelancerSkills.map((skill) => skill.skill_id);

    // Get tickets that match freelancer's skills
    const tickets = await Ticket.findAll({
      where: {
        ticket_status: "open",
        assigned_freelancer_id: null,
        skill_id: {
          [Op.in]: skillIds,
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
      order: [["createdAt", "DESC"]],
    });

    logger.info("Tickets for freelancer retrieved successfully");
    return tickets;
  } catch (error) {
    logger.error("Error getting tickets for freelancer: %o", error);
    throw new Error(`Failed to fetch available tickets: ${error.message}`);
  }
};

exports.cancelTicket = async (ticket_id, user_id) => {
  logger.info("cancelTicket function called");
  try {
    // Retrieve the ticket along with its associated subscription
    const ticket = await Ticket.findByPk(ticket_id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Ensure the ticket belongs to the requesting user
    // const ticket = await Ticket.findByPk(ticket_id, {
    //   include: [{ model: Subscription, as: "subscription" }],
    // });

    //   if (ticket.subscription.user_id !== user_id) {
    //     throw new Error("Unauthorized: Ticket does not belong to the user");
    //   }

    // Calculate the time difference from the ticket's creation to now
    const createdAt = ticket.createdAt; // Assuming timestamps are enabled
    const currentTime = new Date();
    const diffMs = currentTime - createdAt; // Difference in milliseconds
    const diffHours = diffMs / (1000 * 60 * 60);

    // Check if the cancellation is within 6 hours
    if (diffHours > 6) {
      throw new Error("Ticket cancellation period has expired (6 hours)");
    }

    // Update the ticket status to "cancel"
    ticket.ticket_status = "cancel";
    await ticket.save();
    logger.info("Ticket cancelled successfully");
    return ticket;
  } catch (error) {
    logger.error("Error cancelling ticket: %o", error);
    throw error;
  }
};
/// Function to calculate response rate (example implementation)
const calculateResponseRate = async (freelancer_id) => {
  try {
    const totalTickets = await Ticket.count({
      where: {
        assigned_freelancer_id: freelancer_id,
      },
    });
    const respondedTickets = await Ticket.count({
      where: {
        assigned_freelancer_id: freelancer_id,
        ticket_status: "inProgress",
      },
    });
    return totalTickets > 0 ? (respondedTickets / totalTickets) * 100 : 0;
  } catch (error) {
    throw error;
  }
};
// Function to calculate average rating (example implementation)
exports.getActiveTicketsByFreelancer = async (freelancer_id) => {
  try {
    if (!freelancer_id) {
      throw new Error("Freelancer ID is required");
    }

    const tickets = await db.tickets.findAll({
      where: {
        assigned_freelancer_id: freelancer_id,
        ticket_status: "inProgress",
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
      order: [["accepted_at", "DESC"]],
    });

    logger.info(
      `Found ${tickets.length} active tickets for freelancer ${freelancer_id}`
    );
    return tickets;
  } catch (error) {
    logger.error("Error getting active tickets for freelancer:", error);
    throw error;
  }
};

exports.getTicketHistoryByFreelancer = async (freelancer_id) => {
  try {
    return await Ticket.findAll({
      where: {
        assigned_freelancer_id: freelancer_id,
        ticket_status: ["resolved", "cancelled"],
      },
      include: [
        {
          model: db.subscriptions,
          include: [{ model: db.users, attributes: ["name"] }],
        },
        {
          model: db.skills,
          attributes: ["skill_name"],
        },
      ],
    });
  } catch (error) {
    throw error;
  }
};

exports.getFreelancerStats = async (freelancer_id) => {
  try {
    const stats = {
      activeTickets: await Ticket.count({
        where: {
          assigned_freelancer_id: freelancer_id,
          ticket_status: "inProgress",
        },
      }),
      completedTickets: await Ticket.count({
        where: {
          assigned_freelancer_id: freelancer_id,
          ticket_status: "resolved",
        },
      }),
      // Calculate response rate (assuming you track ticket acceptance time)
      responseRate: await calculateResponseRate(freelancer_id),
      // Calculate average rating
      rating: await calculateAverageRating(freelancer_id),
    };
    return stats;
  } catch (error) {
    throw error;
  }
};

// Add a new function for admin to finalize tickets
exports.adminFinalizeTicket = async (ticket_id, calls_to_deduct) => {
  logger.info("adminFinalizeTicket function called");
  try {
    return await sequelize.transaction(async (t) => {
      const ticket = await Ticket.findByPk(ticket_id, { transaction: t });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      if (ticket.ticket_status !== "pending_admin_review") {
        throw new Error("Ticket is not pending admin review");
      }

      // Set the final resolved status
      ticket.ticket_status = "resolved";
      ticket.resolved_at = new Date();
      ticket.calls_deducted = calls_to_deduct;
      ticket.isCharged = true;

      await ticket.save({ transaction: t });

      // Get the subscription to deduct calls from
      const subscription = await Subscription.findByPk(ticket.subscription_id, {
        transaction: t,
      });

      if (!subscription) {
        throw new Error("Associated subscription not found");
      }

      // Ensure we don't go negative
      const newRemainingCalls = Math.max(
        0,
        subscription.remainingCalls - calls_to_deduct
      );
      subscription.remainingCalls = newRemainingCalls;
      await subscription.save({ transaction: t });

      logger.info("Ticket finalized successfully");
      return ticket;
    });
  } catch (error) {
    logger.error("Error finalizing ticket: %o", error);
    throw error;
  }
};

// Add function to get all tickets requiring admin review
exports.getPendingAdminReviewTickets = async () => {
  logger.info("getPendingAdminReviewTickets function called");
  try {
    const tickets = await Ticket.findAll({
      where: {
        ticket_status: "pending_admin_review",
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
        {
          // Fix: Use the correct alias "assignedFreelancer"
          model: db.freelancers,
          as: "assignedFreelancer", // This matches your model association
          attributes: ["freelancer_id"],
          include: [
            {
              model: db.users,
              attributes: ["name", "mobile_no"],
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    logger.info("Found %d tickets pending admin review", tickets.length);
    return tickets;
  } catch (error) {
    logger.error("Error getting pending admin review tickets: %o", error);
    throw error;
  }
};

// Add this to ticketService.js
// Get all tickets for admin with optional status filter
exports.getAllTicketsForAdmin = async (statusFilter) => {
  logger.info("getAllTicketsForAdmin function called");
  try {
    // Build the where clause based on status filter
    const whereClause =
      statusFilter && statusFilter !== "all"
        ? { ticket_status: statusFilter }
        : {};

    const tickets = await Ticket.findAll({
      where: whereClause,
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
        {
          model: db.freelancers,
          as: "assignedFreelancer", // Using the correct alias
          attributes: ["freelancer_id"],
          include: [
            {
              model: db.users,
              attributes: ["name", "mobile_no"],
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    logger.info("Found %d tickets for admin", tickets.length);
    return tickets;
  } catch (error) {
    logger.error("Error getting all tickets for admin: %o", error);
    throw error;
  }
};
