// filepath: /c:/MCA/backend_trial/backend_trial/routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
// const { checkPermission } = require("../middleware/authorizationMiddelware");
const authenticate = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/checkPermission");

// Get all categories
router.get("/", categoryController.getAllCategories);

// Get a category by ID
router.get("/:categoryId", categoryController.getCategoryById);

// Create a new category
router.post("/",authenticate,checkPermission("create_category") ,categoryController.createCategory);

// Update a category
router.put("/:categoryId", categoryController.updateCategory);

// Delete a category
router.delete("/:categoryId", categoryController.deleteCategory);

module.exports = router;







