const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      logger.warn("No local file path provided for upload");
      return null;
    }

    // Get file extension
    const fileExtension = path.extname(localFilePath).toLowerCase();
    logger.info(`Uploading file with extension: ${fileExtension}`);

    // Set resource type dynamically
    let resourceType = "image"; // Default to image
    if (fileExtension === ".pdf") {
      resourceType = "raw"; // Force raw for PDFs
    }

    // Upload file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
    });

    logger.info("Cloudinary upload successful", { response });

    // Delete local file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      logger.info(`Local file deleted: ${localFilePath}`);
    }

    return response;
  } catch (error) {
    logger.error("Cloudinary Upload Error", {
      error: error.response || error.message,
    });

    // Ensure local file is deleted even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      logger.info(`Local file deleted after upload failure: ${localFilePath}`);
    }

    return null;
  }
};
//delete image from cloudinary if we delete the product
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      logger.warn("No public ID provided for deletion");
      return null;
    }

    // Delete file from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`File deleted from Cloudinary: ${publicId}`, { result });
    return result;
  } catch (error) {
    logger.error("Cloudinary Delete Error", {
      error: error.response || error.message,
      publicId
    });
    throw error;
  }
};

module.exports = { 
  uploadOnCloudinary,
  deleteFromCloudinary 
};
