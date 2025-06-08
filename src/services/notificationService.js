const socketConfig = require("../config/socketConfig");
const logger = require("../utils/logger");
const db = require("../models");
const pushConfig = require("../config/pushNotificationsConfig");
const webpush = pushConfig.webpush;

const Freelancer = db.freelancers;
const Skill = db.skills;
const User = db.users;

exports.notifyFreelancerOfNewTicket = async (ticket) => {
  try {
    const io = socketConfig.getIO();

    // Get skill information if ticket has a skill_id
    let skillName = "General Support";
    let skillId = ticket.skill_id;
    if (skillId) {
      const skill = await db.skills.findByPk(skillId);
      if (skill) skillName = skill.skill_name;
    }

    // Only get freelancers with the matching skill or all freelancers if it's general support
    let freelancers;
    if (skillId) {
      // Find freelancers with the specific skill
      freelancers = await Freelancer.findAll({
        include: [
          {
            model: User,
            attributes: ["user_id", "email"],
          },
          {
            model: Skill,
            as: "skills",
            where: { skill_id: skillId },
            required: true,
          },
        ],
      });
    } else {
      // If no specific skill, notify all freelancers
      freelancers = await Freelancer.findAll({
        include: [
          {
            model: User,
            attributes: ["user_id", "email"],
          },
        ],
      });
    }

    // Add this after your freelancer query
    console.log(
      "First freelancer structure:",
      JSON.stringify(freelancers[0], null, 2)
    );

    // After your freelancers query
    console.log(`Skill ID: ${skillId}, Skill Name: ${skillName}`);
    console.log(`Found ${freelancers.length} qualified freelancers`);
    freelancers.forEach((f) => {
      console.log(
        `- Freelancer ID: ${f.freelancer_id}, Name: ${f.first_name || "Unknown"}`
      );
    });

    const notificationData = {
      type: "NEW_TICKET",
      ticket: {
        ticket_id: ticket.ticket_id,
        description: ticket.ticket_description,
        status: ticket.ticket_status,
        created_at: ticket.created_at,
      },
    };

    // Then in the loop, update how you access the user:
    for (const freelancer of freelancers) {
      // Send socket notification
      io.to(`freelancer-${freelancer.freelancer_id}`).emit(
        "newTicket",
        notificationData
      );

      // Check if freelancer has an associated user
      // Since you didn't use an alias, Sequelize likely uses the model name
      if (!freelancer.user && !freelancer.User) {
        logger.warn("Freelancer has no associated user", {
          freelancerId: freelancer.freelancer_id,
        });
        continue; // Skip to the next freelancer
      }

      // Use either freelancer.user or freelancer.User depending on Sequelize's naming
      const user = freelancer.user || freelancer.User;
      const user_id = user.user_id;

      // Rest of your code...
      const subscriptions = await db.notifications.findAll({
        where: { user_id },
      });

      // Send push notification to all their registered devices
      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = JSON.stringify({
          title: "New Support Ticket Available",
          body: `A new ${skillName} ticket is ready for you to accept.`,
          icon: `${process.env.FRONTEND_URL}/logo.jpg`,
          badge: `${process.env.FRONTEND_URL}/badge-icon.png`,
          tag: `ticket-${ticket.ticket_id}`, // Group similar notifications
          data: {
            url: "/freelancer/dashboard",
            ticket_id: ticket.ticket_id,
          },
        });

        // Send to all subscriptions for this user
        for (const subscription of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              pushPayload
            );

            logger.info("Push notification sent to freelancer", {
              freelancerId: freelancer.freelancer_id,
              userId: user_id,
            });
          } catch (error) {
            logger.error("Error sending push notification", {
              error: error.message,
              endpoint: subscription.endpoint,
              freelancerId: freelancer.freelancer_id,
            });

            // If subscription is expired or invalid, remove it
            if (error.statusCode === 404 || error.statusCode === 410) {
              await db.notifications.destroy({
                where: { notification_id: subscription.notification_id },
              });
              logger.info("Removed invalid subscription", {
                subscriptionId: subscription.notification_id,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error sending notifications", { error: error.message });
  }
};
