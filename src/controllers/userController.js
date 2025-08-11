const fs = require("fs");
const db = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize"); // Import Op
const { uploadOnCloudinary } = require("../utils/cloudinary");
const crypto = require("crypto"); // Add this at the top with other requires
const logger = require("../utils/logger");

const User = db.users;
const Customer = db.customers;
const Consultant = db.consultants;
const Distributor = db.distributors;
const Freelancer = db.freelancers;

const Role = db.roles;

const FreelancerSkill = db.freelancerSkills;

const models = {
  customers: db.customers,
  consultants: db.consultants,
  distributors: db.distributors,
  freelancers: db.freelancers,
}; // need to check the lines

const ACCESS_TOKEN_EXPIRY = "24h"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "None",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}; // Add these constants at the top of the file

const userController = {
  registerUser: async (req, res) => {
    try {
      const { name, email, password, mobile_no, address, role_name, ...rest } =
        req.body;

      // Common validation
      console.log("Request body:", req.body);
      console.log("Request files:", req.files);
      console.log("Request headers:", req.headers["content-type"]);
      if (
        !name ||
        !email ||
        !password ||
        !mobile_no ||
        !address ||
        !role_name
      ) {
        return res.status(400).json({
          message: "All common fields are required",
          required: [
            "name",
            "email",
            "password",
            "mobile_no",
            "address",
            "role_name",
          ],
        });
      }

      // Check existing user
      const existingUser = await User.findOne({
        where: { [Op.or]: [{ email }, { mobile_no }] },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email or mobile number already exists" });
      }

      // Get role
      const role = await Role.findOne({ where: { role_name } });
      if (!role) {
        return res.status(400).json({ message: "Invalid role name" });
      }

      // Handle different role registrations
      switch (role_name.toLowerCase()) {
        case "customer":
          // Validate customer-specific fields
          if (!rest.gst_type || !rest.company_size) {
            return res.status(400).json({
              message: "Missing customer fields",
              required: ["gst_type", "company_size"],
            });
          }

          // Additional validation for GST number
          if (rest.gst_type === "registered" && !rest.gst_no) {
            return res.status(400).json({
              message: "GST Number is required for registered GST type",
            });
          }

          await db.sequelize.transaction(async (t) => {
            // Create user
            const user = await User.create(
              {
                name,
                email,
                password: await bcrypt.hash(password, 10),
                mobile_no,
                address,
                role_id: role.role_id,
              },
              { transaction: t }
            );

            // Create customer profile with conditional GST number
            await Customer.create(
              {
                user_id: user.user_id,
                gst_type: rest.gst_type,
                gst_no: rest.gst_type === "registered" ? rest.gst_no : null,
                company_size: rest.company_size,
              },
              { transaction: t }
            );

            logger.info(`Customer registered successfully: ${user.user_id}`);
            return res.status(201).json({
              message: "Customer registered successfully",
              user_id: user.user_id,
            });
          });
          break;

        case "consultant":
          // Existing pending registration logic for consultant
          let consultantRegistrationData = {
            basic: {
              name,
              email,
              password: await bcrypt.hash(password, 10),
              mobile_no,
              address,
            },
            role_id: role.role_id,
            consultant: {
              gst_type: rest.gst_type,
              gst_no: rest.gst_no,
              company_size: rest.company_size,
            },
          };

          // Create pending registration
          const pendingConsultantReg = await db.pendingRegistrations.create({
            registration_data: consultantRegistrationData,
            role_id: role.role_id,
            status: "pending",
          });

          return res.status(201).json({
            message: "Registration pending admin approval",
            pending_id: pendingConsultantReg.pending_id,
            status: "pending",
          });
          break;

        case "freelancer":
        case "distributor":
          // Existing pending registration logic for freelancer/distributor
          let registrationData = {
            basic: {
              name,
              email,
              password: await bcrypt.hash(password, 10),
              mobile_no,
              address,
            },
            role_id: role.role_id,
          };

          // Handle Freelancer specific data
          if (role_name === "freelancer") {
            // Process skills
            let skillsData = [];
            if (rest.skill_ids) {
              skillsData = Array.isArray(rest.skill_ids)
                ? rest.skill_ids
                : JSON.parse(rest.skill_ids);
            }
            let certificatesData = [];
            if (req.files?.skill_certificate) {
              const certificateFiles = Array.isArray(
                req.files.skill_certificate
              )
                ? req.files.skill_certificate
                : [req.files.skill_certificate];

              certificatesData = certificateFiles.map((file) => ({
                temp_path: file.path,
                originalname: file.originalname,
              }));
            }

            registrationData.freelancer = {
              experience: rest.experience,
              skills: skillsData,
              certificates: certificatesData,
            };
          }

          // Handle Distributor specific data
          if (role_name === "distributor") {
            registrationData.distributor = {
              gst_type: rest.gst_type,
              gst_no: rest.gst_type === "registered" ? rest.gst_no : null,
              company_size: rest.company_size,
              IT_admin: rest.IT_admin,
            };
          }

          // Create pending registration
          const pendingReg = await db.pendingRegistrations.create({
            registration_data: registrationData,
            role_id: role.role_id,
            status: "pending",
          });

          return res.status(201).json({
            message: "Registration pending admin approval",
            pending_id: pendingReg.pending_id,
            status: "pending",
          });
          break;

        default:
          return res.status(400).json({
            message: "Invalid role for registration",
            received: role_name,
          });
      }
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({
        message: "Registration failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  approveRegistration: async (req, res) => {
    const { pending_id } = req.params;
    logger.info(`Approving registration ${pending_id}`);

    try {
      await db.sequelize.transaction(async (t) => {
        const pendingReg = await db.pendingRegistrations.findOne({
          where: {
            pending_id,
            status: "pending",
          },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!pendingReg) {
          throw new Error("Invalid pending registration");
        }

        const { basic, freelancer, distributor, consultant } =
          pendingReg.registration_data;

        // Create user
        const user = await User.create(
          {
            ...basic,
            role_id: pendingReg.role_id,
          },
          { transaction: t }
        );

        // Handle Freelancer registration
        if (freelancer) {
          const newFreelancer = await Freelancer.create(
            {
              user_id: user.user_id,
              experience: freelancer.experience,
            },
            { transaction: t }
          );

          // Create skills associations
          if (freelancer.skills?.length > 0) {
            await FreelancerSkill.bulkCreate(
              freelancer.skills.map((skill_id) => ({
                freelancer_id: newFreelancer.freelancer_id,
                skill_id,
              })),
              { transaction: t }
            );
          }

          // Now upload certificates to Cloudinary
          if (freelancer.certificates?.length > 0) {
            logger.info(
              `Processing ${freelancer.certificates.length} certificates for upload`
            );

            const certificateUploads = await Promise.all(
              freelancer.certificates.map(async (cert) => {
                try {
                  logger.info(`Checking certificate path: ${cert.temp_path}`);

                  if (!cert.temp_path) {
                    logger.error("Certificate path is undefined");
                    return null;
                  }

                  if (!fs.existsSync(cert.temp_path)) {
                    logger.error(
                      `Certificate file not found at path: ${cert.temp_path}`
                    );
                    return null;
                  }

                  logger.info("Uploading to Cloudinary...");
                  const uploadResult = await uploadOnCloudinary(cert.temp_path);

                  if (!uploadResult) {
                    logger.error(
                      "Cloudinary upload failed - no result returned"
                    );
                    return null;
                  }

                  logger.info(
                    `Upload successful. URL: ${uploadResult.secure_url}`
                  );

                  return {
                    freelancer_id: newFreelancer.freelancer_id,
                    certificate_url: uploadResult.secure_url,
                    certificate_public_id: uploadResult.public_id,
                  };
                } catch (error) {
                  logger.error("Certificate upload failed:", {
                    error: error.message,
                    stack: error.stack,
                    certPath: cert.temp_path,
                  });
                  return null;
                }
              })
            );

            // Filter and log valid uploads
            const validCertificates = certificateUploads.filter(
              (cert) => cert !== null
            );
            logger.info(
              `Valid certificates to save: ${validCertificates.length}`
            );

            if (validCertificates.length > 0) {
              try {
                const savedCertificates =
                  await db.freelancerCertificates.bulkCreate(
                    validCertificates,
                    { transaction: t }
                  );
                logger.info(
                  `Saved ${savedCertificates.length} certificates to database`
                );
              } catch (error) {
                logger.error("Failed to save certificates to database:", error);
                throw error; // This will trigger transaction rollback
              }
            } else {
              logger.warn("No valid certificates to save");
            }
          }
        }

        // Handle Distributor registration
        if (distributor) {
          logger.info("Creating distributor profile for user ${user.user_id}");

          try {
            const newDistributor = await Distributor.create(
              {
                user_id: user.user_id,
                gst_type: distributor.gst_type,
                gst_no: distributor.gst_no,
                company_size: distributor.company_size,
                IT_admin: distributor.IT_admin,
              },
              { transaction: t }
            );
            logger.info("Distributor profile created successfully:", {
              distributor_id: newDistributor.distributor_id,
            });
          } catch (error) {
            logger.error("Failed to create distributor profile:", error);
            throw error;
          }
        }

        // Handle Consultant registration
        if (consultant) {
          logger.info("Creating consultant profile for user ${user.user_id}");

          try {
            const newConsultant = await Consultant.create(
              {
                user_id: user.user_id,
                gst_type: consultant.gst_type,
                gst_no: consultant.gst_no,
                company_size: consultant.company_size,
              },
              { transaction: t }
            );
            logger.info("Consultant profile created successfully:", {
              consultant_id: newConsultant.consultant_id,
            });
          } catch (error) {
            logger.error("Failed to create consultant profile:", error);
            throw error;
          }
        }

        // Update registration status
        await pendingReg.update(
          {
            status: "approved",
          },
          { transaction: t }
        );

        logger.info(`Registration ${pending_id} approved successfully`);
      });

      res.status(200).json({
        message: "Registration approved successfully",
        pending_id,
      });
    } catch (error) {
      logger.error(`Error approving registration ${pending_id}:`, error);
      if (error.message === "Invalid pending registration") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Error approving registration" });
    }
  },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({
        where: { email },
        include: [
          {
            model: db.roles,
            attributes: ["role_name"],
          },
        ],
      });

      if (!user) {
        logger.warn("Login failed: Invalid email", { email });
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        logger.warn("Login failed: Invalid password", { email });
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Generate refresh token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      logger.debug("Generated refresh token", { userId: user.user_id });

      // Store refresh token in database
      await user.update({
        refresh_token: refreshToken,
        refresh_token_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ),
      });
      logger.debug("Stored refresh token", { userId: user.user_id });

      // Create access token
      const accessToken = jwt.sign(
        { user_id: user.user_id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      // Set cookies
      res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
      res.cookie("jwt", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000,
      });

      logger.info("User logged in successfully", {
        userId: user.user_id,
        roleId: user.role_id,
      });

      res.json({
        accessToken,
        user: {
          user_id: user.user_id,
          role_id: user.role_id,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error("Login error", {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ message: "Server error" });
    }
  },

  logoutUser: async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        // Clear refresh token in database
        await User.update(
          {
            refresh_token: null,
            refresh_token_expires_at: null,
          },
          {
            where: { refresh_token: refreshToken },
          }
        );
      }

      // Clear cookies
      res.clearCookie("jwt");
      res.clearCookie("refreshToken");

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error during logout" });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" });
      }

      const user = await User.findOne({
        where: {
          refresh_token: refreshToken,
          refresh_token_expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { user_id: user.user_id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const newRefreshToken = crypto.randomBytes(40).toString("hex");

      // Update refresh token in database
      await user.update({
        refresh_token: newRefreshToken,
        refresh_token_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ),
      });

      // Set new cookies
      res.cookie("refreshToken", newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
      res.cookie("jwt", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Create User with Role-Specific Data
  createUser: async (req, res) => {
    const { name, email, password, mobile_no, address, role_name, ...rest } =
      req.body;
    try {
      if (!name || !email || !password || !mobile_no || !address || !role_name)
        return res.status(400).json({ message: "All fields are required" });

      const existingUser = await User.findOne({
        where: { [Op.or]: [{ email }, { mobile_no }] },
      });
      if (existingUser)
        return res
          .status(400)
          .json({ message: "Email or Mobile number already exists" });

      const role = await Role.findOne({ where: { role_name } });
      if (!role) return res.status(400).json({ message: "Invalid role name" });

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.sequelize.transaction(async (t) => {
        const user = await User.create(
          {
            name,
            email,
            password: hashedPassword,
            mobile_no,
            address,
            role_id: role.role_id,
          },
          { transaction: t }
        );

        const roleTable = models[role_name.toLowerCase() + "s"];
        if (roleTable) {
          await roleTable.create(
            { user_id: user.user_id, ...rest },
            { transaction: t }
          );
        }

        res.status(201).json({ message: "User created successfully", user });
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  // Delete User and Role-Specific Data
  deleteUser: async (req, res) => {
    const { user_id } = req.params;
    try {
      const user = await User.findByPk(user_id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const role = await Role.findByPk(user.role_id);
      const roleTable = models[role.role_name.toLowerCase() + "s"];

      await db.sequelize.transaction(async (t) => {
        if (roleTable)
          await roleTable.destroy({ where: { user_id } }, { transaction: t });
        await User.destroy({ where: { user_id } }, { transaction: t });
        res.json({ message: "User deleted successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  // Add these new methods
  getPendingRegistrations: async (req, res) => {
    try {
      const pendingRegistrations = await db.pendingRegistrations.findAll({
        where: { status: "pending" },
        include: [
          {
            model: db.roles,
            attributes: ["role_name"],
          },
        ],
      });

      res.status(200).json(pendingRegistrations);
    } catch (error) {
      console.error("Error getting pending registrations:", error);
      res.status(500).json({ message: "Error fetching pending registrations" });
    }
  },

  getPendingRegistrationDetails: async (req, res) => {
    try {
      const { pending_id } = req.params;
      const registration = await db.pendingRegistrations.findByPk(pending_id, {
        include: [
          {
            model: db.roles,
            attributes: ["role_name"],
          },
        ],
      });

      if (!registration) {
        return res
          .status(404)
          .json({ message: "Pending registration not found" });
      }

      res.status(200).json(registration);
    } catch (error) {
      console.error("Error getting registration details:", error);
      res.status(500).json({ message: "Error fetching registration details" });
    }
  },

  rejectRegistration: async (req, res) => {
    const { pending_id } = req.params;
    logger.info(`Rejecting registration ${pending_id}`);

    try {
      await db.sequelize.transaction(async (t) => {
        const registration = await db.pendingRegistrations.findOne({
          where: {
            pending_id,
            status: "pending",
          },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!registration) {
          throw new Error("Invalid pending registration");
        }

        // Clean up temporary files
        if (registration.registration_data.freelancer?.certificates) {
          registration.registration_data.freelancer.certificates.forEach(
            (cert) => {
              if (fs.existsSync(cert.temp_path)) {
                fs.unlinkSync(cert.temp_path);
              }
            }
          );
        }

        // Clean up temporary consultant data
        if (registration.registration_data.consultant) {
          logger.info("Cleaning up consultant registration data for rejection");
          // Add any specific cleanup logic for consultant data if needed
        }

        await registration.update(
          {
            status: "rejected",
          },
          { transaction: t }
        );

        logger.info(`Registration ${pending_id} rejected successfully`);
      });

      res.status(200).json({
        message: "Registration rejected successfully",
        pending_id,
      });
    } catch (error) {
      logger.error(`Error rejecting registration ${pending_id}:`, error);
      res.status(500).json({ message: "Error rejecting registration" });
    }
  },
  silentRefresh: async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" });
      }

      const user = await User.findOne({
        where: {
          refresh_token: refreshToken,
          refresh_token_expires_at: {
            [db.Sequelize.Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        { user_id: user.user_id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Set new access token cookie
      res.cookie("jwt", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ message: "Token refreshed successfully" });
    } catch (error) {
      logger.error("Silent refresh error:", error);
      res.status(500).json({ message: "Silent refresh failed" });
    }
  },
  getUserStats: async (req, res) => {
    try {
      // First get counts grouped by role_id
      const groupedCounts = await db.users.findAll({
        attributes: [
          "role_id",
          [db.sequelize.fn("COUNT", db.sequelize.col("user_id")), "count"],
        ],
        group: ["role_id"],
        raw: true,
      });

      // Fetch role names
      const roles = await db.roles.findAll({
        attributes: ["role_id", "role_name"],
        raw: true,
      });

      const roleIdToName = new Map(roles.map((r) => [r.role_id, r.role_name]));

      const formattedStats = groupedCounts.map((row) => ({
        role_id: row.role_id,
        role_name: roleIdToName.get(row.role_id) || "unknown",
        count: parseInt(row.count, 10) || 0,
      }));

      res.json(formattedStats);
    } catch (error) {
      logger.error("Error fetching user statistics:", error);
      res.status(500).json({ message: "Error fetching statistics" });
    }
  },

  getFilteredUsers: async (req, res) => {
    try {
      const { roleId } = req.params;

      const users = await db.users.findAll({
        where: { role_id: roleId },
        attributes: ["user_id", "name", "email", "mobile_no", "address"],
      });

      res.json(users);
    } catch (error) {
      logger.error("Error fetching filtered users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  },

  getCustomerProfile: async (req, res) => {
    try {
      console.log("Finding user with ID:", req.user.user_id);

      const user = await User.findOne({
        where: { user_id: req.user.user_id },
        attributes: ["name", "email", "mobile_no", "address"],
        include: [
          {
            model: Customer,
            as: "Customer", // Match the alias from model association
            attributes: ["gst_type", "gst_no", "company_size"],
          },
        ],
      });

      if (!user) {
        logger.error(`User not found: ${req.user.user_id}`);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Debug logs
      console.log("User data:", user);
      console.log("Customer data:", user.Customer);

      const profileData = {
        name: user.name,
        email: user.email,
        mobile_no: user.mobile_no,
        address: user.address,
        gst_type: user.Customer?.gst_type,
        gst_no: user.Customer?.gst_no,
        company_size: user.Customer?.company_size,
      };

      res.json(profileData);
    } catch (error) {
      logger.error("Error fetching profile:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching profile data",
      });
    }
  },

  getDistributorProfile: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.user_id, {
        attributes: ["name", "email", "mobile_no", "address"],
        include: [
          {
            model: Distributor,
            attributes: ["gst_type", "gst_no", "company_size", "IT_admin"],
          },
        ],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Combine user and distributor data
      const profileData = {
        ...user.dataValues,
        ...user.Distributor.dataValues,
      };

      res.json(profileData);
    } catch (error) {
      logger.error("Error fetching distributor profile:", error);
      res.status(500).json({ message: "Error fetching profile data" });
    }
  },

  getConsultantProfile: async (req, res) => {
    try {
      const user = await User.findOne({
        where: { user_id: req.user.user_id },
        attributes: ["name", "email", "mobile_no", "address"],
        include: [
          {
            model: Consultant,
            as: "Consultant", // Match the alias from model association
            attributes: ["gst_type", "gst_no", "company_size"],
          },
        ],
      });

      if (!user) {
        logger.error(`User not found: ${req.user.user_id}`);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const profileData = {
        name: user.name,
        email: user.email,
        mobile_no: user.mobile_no,
        address: user.address,
        gst_type: user.Consultant?.gst_type,
        gst_no: user.Consultant?.gst_no,
        company_size: user.Consultant?.company_size,
      };

      res.json(profileData);
    } catch (error) {
      logger.error("Error fetching consultant profile:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching profile data",
      });
    }
  },
};
function getModel(roleId) {
  switch (roleId) {
    case 1:
      return Customer;
    case 2:
      return Consultant;
    case 3:
      return Distributor;
    case 4:
      return Freelancer;

    default:
      return null;
  }
}
module.exports = userController;
