const db = require("../models");
const logger = require("../utils/logger");

const defaultRoles = [
  {
    role_name: "customer",
  },
  {
    role_name: "consultant",
  },
  {
    role_name: "distributor",
  },
  {
    role_name: "freelancer",
  },
  {
    role_name: "superadmin",
  },
];

const initializeRoles = async () => {
  try {
    for (const role of defaultRoles) {
      // Check if role already exists
      const [existingRole, created] = await db.roles.findOrCreate({
        where: { role_name: role.role_name },
        defaults: {
          ...role,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      if (created) {
        logger.info(`Created role: ${role.role_name}`);
      } else {
        logger.info(`Role ${role.role_name} already exists`);
      }
    }
    logger.info("Roles initialization completed");
  } catch (error) {
    logger.error("Error initializing roles: %o", error);
    throw error;
  }
};

module.exports = initializeRoles;
