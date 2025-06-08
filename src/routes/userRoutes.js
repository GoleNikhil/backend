const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const validateUser = require("../validations/validateSchema");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/multer.middleware");
// const { checkPermission } = require("../middleware/authorizationMiddelware");
const { checkPermission } = require("../middleware/checkPermission");
const db = require("../models");
const logger = require("../utils/logger");

router.post("/register", upload, userController.registerUser); // Route /register

// Login user
router.post("/login", userController.loginUser);
// Protected admin routes for registration approval
router.get(
  "/pending-registrations",
  authenticate,
  checkPermission("view_pending_registrations"),
  userController.getPendingRegistrations
);

router.get(
  "/pending-registrations/:pending_id",
  authenticate,
  checkPermission("view_pending_registrations"),
  userController.getPendingRegistrationDetails
);

router.post(
  "/approve-registration/:pending_id",
  authenticate,
  checkPermission("approve_registrations"),
  userController.approveRegistration
);

router.post(
  "/reject-registration/:pending_id",
  authenticate,
  checkPermission("reject_registrations"),
  userController.rejectRegistration
);

router.post("/silent-refresh", userController.silentRefresh);

// example of a protected route
router.get("/profile", authenticate, (req, res) => {
  // Access user information from req.user
  res.json({
    message: "Profile",
    user: req.user,
    userFromSession: req.session.user,
  });
});

// filepath: /c:/MCA/backend_trial/backend_trial/routes/userRoutes.js
router.post("/logout", userController.logoutUser);

router.delete("/:user_id", userController.deleteUser); // Corrected route

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await db.users.findByPk(req.user.user_id, {
      attributes: ["user_id", "email", "role_id"],
      include: [
        {
          model: db.roles,
          attributes: ["role_name"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    logger.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add these new routes
router.get("/profile/customer", authenticate, async (req, res) => {
  console.log("Profile request received, user:", req.user);
  await userController.getCustomerProfile(req, res);
});

 router.get(
  "/profile/consultant",
  authenticate,
  userController.getConsultantProfile
);

router.get(
  "/profile/distributor",
  authenticate,
  userController.getDistributorProfile
);
router.get(
  "/stats",
  authenticate,
  checkPermission("manage_users"),
  userController.getUserStats
); // Route to get user statistics

router.get(
  "/filtered/:roleId",
  authenticate,
  checkPermission("manage_users"),
  userController.getFilteredUsers
);

module.exports = router;
