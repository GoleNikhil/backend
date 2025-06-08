const jwt = require("jsonwebtoken");
const db = require("../models");
const crypto = require("crypto");
const logger = require("../utils/logger");

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "None",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const authenticate = async (req, res, next) => {
  const accessToken = req.cookies.jwt;
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken) {
    logger.warn("No JWT cookie found. Available cookies:", req.cookies);
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    // Add validation for decoded token structure
    if (!decoded || !decoded.user_id || !decoded.role_id) {
      logger.error("Invalid token structure:", decoded);
      return res.status(401).json({
        message: "Invalid token structure",
        code: "INVALID_TOKEN_STRUCTURE",
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    // Handle expired token
    if (error.name === "TokenExpiredError" && refreshToken) {
      try {
        // Find user with valid refresh token
        const user = await db.users.findOne({
          where: {
            refresh_token: refreshToken,
            refresh_token_expires_at: {
              [db.Sequelize.Op.gt]: new Date(),
            },
          },
        });

        if (!user) {
          return res.status(401).json({
            message: "Session expired",
            code: "SESSION_EXPIRED",
          });
        }

        // Generate new tokens
        const newAccessToken = jwt.sign(
          { user_id: user.user_id, role_id: user.role_id },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
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
        res.cookie(
          "refreshToken",
          newRefreshToken,
          REFRESH_TOKEN_COOKIE_OPTIONS
        );
        res.cookie("jwt", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "None",
          maxAge: 24 * 60 * 60 * 1000,
        });

        // Add tokens to response headers for frontend handling
        res.setHeader("X-New-Access-Token", newAccessToken);
        res.setHeader("X-Token-Refreshed", "true");

        // Update request with new user data
        req.user = { user_id: user.user_id, role_id: user.role_id };

        logger.info("Token auto-refreshed for user:", user.user_id);

        next();
      } catch (refreshError) {
        logger.error("Token refresh failed:", refreshError);
        return res.status(401).json({
          message: "Authentication failed",
          code: "AUTH_FAILED",
        });
      }
    } else {
      return res.status(401).json({
        message: "Unauthorized: Invalid token",
        code: "INVALID_TOKEN",
      });
    }
  }
};
module.exports = authenticate;
