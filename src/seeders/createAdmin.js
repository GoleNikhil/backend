"use strict";

const bcrypt = require("bcrypt");
const db = require("../models");
const logger = require("../utils/logger");
const User = db.users;
const Role = db.roles;

const createAdminUser = async () => {
  try {
    // First check if admin role exists
    logger.info("Checking if admin role exists");
    let adminRole = await Role.findOne({
      where: {
        role_name: "superadmin",
      },
    });

    if (!adminRole) {
      logger.info("Admin role not found. Creating admin role...");
      adminRole = await Role.create({
        role_name: "superadmin",
        description: "Super Administrator with full access",
      });
      logger.info("Admin role created successfully");
    }

    // Check if admin user already exists
    logger.info("Checking if admin user already exists");
    const existingAdmin = await User.findOne({
      where: {
        email: process.env.SUPER_ADMIN_EMAIL || "admin@example.com",
      },
    });

    if (existingAdmin) {
      logger.info("Admin user already exists");
      return existingAdmin;
    }

    // Create admin user
    logger.info("Creating admin user");
    const hashedPassword = await bcrypt.hash(
      process.env.SUPER_ADMIN_PASSWORD || "admin123",
      12
    );
    console.log(
      `Attempting to create admin user with role ID: ${adminRole.role_id}`
    );
    const admin = await User.create({
      name: "Super Admin",
      email: process.env.SUPER_ADMIN_EMAIL || "admin@example.com",
      password: hashedPassword,
      role_id: adminRole.role_id,
      mobile_no: process.env.SUPER_ADMIN_PHONE || null,
      address: process.env.SUPER_ADMIN_ADDRESS || null,
      is_active: true,
      last_login: null,
    });

    logger.info("Admin user created successfully");
    return admin;
  } catch (error) {
    logger.error("Error creating admin user: %o", error);
    throw error;
  }
};

module.exports = createAdminUser;
