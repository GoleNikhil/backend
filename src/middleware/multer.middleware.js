const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const logger = require("../utils/logger");

// Define allowed file types
const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png"];
const allowedPdfTypes = ["application/pdf"];

// Define separate file size limits
const IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2MB for images
const PDF_MAX_SIZE = 5 * 1024 * 1024; // 5MB for PDFs

// Resolve a safe temporary directory for uploads
const defaultTmpDir = path.join(__dirname, "../../uploads/tmp");
const systemTmpDir = os.tmpdir();

function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    logger.error("Failed to ensure upload temp directory:", err);
  }
}

ensureDirectoryExists(defaultTmpDir);

// Define storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    logger.info(`Storing file: ${file.originalname} in temporary storage`);
    // Prefer project uploads/tmp; fallback to OS temp dir
    const targetDir = fs.existsSync(defaultTmpDir) ? defaultTmpDir : systemTmpDir;
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    logger.info(`Saving file with original name: ${file.originalname}`);
    cb(null, file.originalname);
  },
});

// File filter and size validation
const fileFilter = (req, file, cb) => {
  logger.info(`Filtering file: ${file.originalname} of type: ${file.mimetype}`);
  if (file.fieldname === "image") {
    if (!allowedImageTypes.includes(file.mimetype)) {
      logger.warn(`Invalid image type: ${file.mimetype}`);
      return cb(
        new Error("Invalid image type. Only JPG and PNG are allowed."),
        false
      );
    }
    if (file.size > IMAGE_MAX_SIZE) {
      logger.warn(`Image file size exceeds limit: ${file.size}`);
      return cb(new Error("Image file size must be less than 2MB."), false);
    }
  }

  if (file.fieldname === "datasheet") {
    if (!allowedPdfTypes.includes(file.mimetype)) {
      logger.warn(`Invalid datasheet type: ${file.mimetype}`);
      return cb(
        new Error("Invalid datasheet type. Only PDF files are allowed."),
        false
      );
    }
    if (file.size > PDF_MAX_SIZE) {
      logger.warn(`Datasheet file size exceeds limit: ${file.size}`);
      return cb(new Error("Datasheet file size must be less than 5MB."), false);
    }
  }

  if (file.fieldname === "skill_certificate") {
    if (!allowedPdfTypes.includes(file.mimetype)) {
      logger.warn(`Invalid skill certificate type: ${file.mimetype}`);
      return cb(
        new Error(
          "Invalid skill certificate type. Only PDF files are allowed."
        ),
        false
      );
    }
    if (file.size > PDF_MAX_SIZE) {
      logger.warn(`Skill certificate file size exceeds limit: ${file.size}`);
      return cb(
        new Error("Skill certificate file size must be less than 5MB."),
        false
      );
    }
  }

  logger.info(`File ${file.originalname} passed validation`);
  cb(null, true);
};

// Multer Upload Middleware
const upload = multer({
  storage,
  fileFilter,
}).fields([
  { name: "image", maxCount: 1 },
  { name: "datasheet", maxCount: 1 },
  { name: "skill_certificate", maxCount: 10 },
]);

module.exports = upload;
