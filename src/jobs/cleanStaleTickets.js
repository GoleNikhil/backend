const cron = require("node-cron");
const db = require("../models");
const { Op } = require("sequelize");
const Ticket = db.tickets;
const logger = require("../utils/logger"); // Import logger

const cleanStaleTickets = () => {
  // Schedule to run at the top of every hour
  cron.schedule("0 * * * *", async () => {
    logger.info("Scheduled job cleanStaleTickets started");
    try {
      const thresholdDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Find and delete stale tickets
      const staleTickets = await Ticket.findAll({
        where: {
          ticket_status: "open",
          assigned_freelancer_id: null,
          createdAt: { [Op.lt]: thresholdDate },
        },
      });

      if (staleTickets.length > 0) {
        // Delete stale tickets
        await Ticket.destroy({
          where: {
            ticket_id: staleTickets.map((ticket) => ticket.ticket_id),
          },
        });
        logger.info(`Deleted ${staleTickets.length} stale tickets`);
      } else {
        logger.info("No stale tickets to delete");
      }
    } catch (error) {
      logger.error("Error cleaning stale tickets: %o", error);
    }
  });
};

module.exports = cleanStaleTickets;
