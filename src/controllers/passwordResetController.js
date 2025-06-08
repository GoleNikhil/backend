const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");
const db = require("../models");
const { Op } = require("sequelize");
const { message } = require("../validations/validateSkillSchema");


console.log("Available models: ", Object.keys(db));
console.log("Users model: ", db.users);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD || "buycjriywtxvdhtm",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    logger.error("SMTP connection error: ", error);
  } else {
    logger.info("Server is ready to send emails");
  }
});

const passwordResetController = {
  requestReset: async (req, res) => {
    let user;
    try {
      const { email } = req.body;

      if(!email) {
        logger.warn("Password reset attempted without email");
        return res.status(400).json({
          message: "Email is required"
        });
      }

      logger.debug("Password reset requested", {email});

      user = await db.users.findOne({ where: { email: email.toLowerCase() } });

      if (!user) {
        logger.warn("Password reset requested for non-existent email", {
          email,
        });
        return res.status(200).json({
          message: "If an account exists, you will receive a reset email",
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await user.update({
        reset_token: resetToken,
        reset_token_expires_at: resetTokenExpiry,
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      await transporter.sendMail({
        to: user.email,
        subject: "Password Reset Request",
        html: `
                <!DOCTYPE html>
    <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .header {
            color: #1F41BB;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
          }
          .button {
            background-color: #1F41BB;
            color: #FFFFFF !important;  /* Force white color with !important */
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
            margin: 20px 0;
          }
          a.button {
            color: #FFFFFF !important;  /* Explicitly set anchor color */
          }
          .text-center {
            text-align: center;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">Password Reset</h1>
          <p>You requested a password reset for your AVNS account.</p>
          <div class="text-center">
            <a href="${resetUrl}" class="button">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
                `,
      });
      logger.info("Password reset email sent", { userId: user.user_id });
      res.json({ message: "Reset password link sent to email" });
    } catch (emailError) {
      logger.error("Email sending failed", {
        error: emailError.message,
        email: req.body.email,
        userId: user?.user_id,
      });
      res.status(500).json({ message: "Error processing request" });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { newPassword } = req.body;
      const { token } = req.params;

      // Add validation for newPassword
      if (!token || !newPassword) {
        logger.warn("Missing required fields in reset password request");
        return res.status(400).json({
          message: "New password are required",
          details: {
            token: token ? "provided" : "missing",
            password: newPassword ? "provided" : "missing",
          },
        });
      }

      // Log the token for debugging
      logger.debug("Reset password attempt", {
        tokenLength: token.length,
        hasPassword: !!newPassword,
      });

      const user = await db.users.findOne({
        where: {
          reset_token: token,
          reset_token_expires_at: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        logger.warn("Invalid or expired reset token used", { token });
        return res.status(400).json({
          message: "Invalid or expired reset token",
        });
      }

      // Validate password
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        logger.warn("Invalid password format");
        return res.status(400).json({
          message: "Password must be at least 6 characters long",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await user.update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
      });

      logger.info("Password reset successful", { userId: user.user_id });
      res.json({ message: "Password reset successful" });
    } catch (error) {
      logger.error("Password reset failed", {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ message: "Error processing request" });
    }
  },
};

module.exports = passwordResetController;