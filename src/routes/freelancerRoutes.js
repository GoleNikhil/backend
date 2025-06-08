const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const freelancerController = require("../controllers/freelancerController");
const authenticate = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/checkPermission");
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/certificates");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG and PDF files are allowed."),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Create uploads directory if it doesn't exist
const fs = require("fs");
const uploadDir = path.join(__dirname, "../../uploads/certificates");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Routes
router.get("/skills", authenticate, freelancerController.getFreelancerSkills);
router.get(
  "/certificates",
  authenticate,
  freelancerController.getFreelancerCertificates
);
router.post(
  "/skills/request",
  authenticate,
  freelancerController.requestNewSkill
);
router.post(
  "/certificates/request",
  authenticate,
  upload.single("certificate"),
  freelancerController.requestNewCertificate
);

// Add this new route
router.get("/profile", authenticate, freelancerController.getFreelancerProfile);

module.exports = router;
