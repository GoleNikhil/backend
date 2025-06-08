// filepath: /c:/MCA/backend_trial/backend_trial/controllers/categoryController.js
const logger = require("../utils/logger");
const db = require("../models");
const Category = db.categories;
const Product = db.products; // Import the Product model

const categoryController = {
  // Get all categories
  getAllCategories: async (req, res) => {
    logger.info("getAllCategories function called");
    try {
      const categories = await Category.findAll();
      logger.info("getAllCategories function executed successfully");
      res.status(200).json(categories);
    } catch (error) {
      logger.error("Error getting categories: %o", error);
      res.status(500).json({ message: "Error getting categories" });
    }
  },

  // Get a category by ID
  getCategoryById: async (req, res) => {
    logger.info("getCategoryById function called");
    try {
      const categoryId = req.params.categoryId;
      const category = await Category.findByPk(categoryId, {
        include: [
          {
            model: Product,
            as: "Products", // Use the alias if you defined one in the associatin
          },
        ],
      });

      if (!category) {
        logger.warn("Category not found: %s", categoryId);
        return res.status(404).json({ message: "Category not found" });
      }

      logger.info("getCategoryById function executed successfully");
      res.status(200).json(category);
    } catch (error) {
      logger.error("Error getting category: %o", error);
      res.status(500).json({ message: "Error getting category" });
    }
  },

  // Create a new category
  createCategory: async (req, res) => {
    logger.info("createCategory function called");
    try {
      const { category_name } = req.body;

      // Validate input (you can use a separate validation middleware here)
      if (!category_name) {
        logger.warn("Category name is required");
        return res.status(400).json({ message: "Category name is required" });
      }

      const newCategory = await Category.create({ category_name });
      logger.info("createCategory function executed successfully");
      res.status(201).json(newCategory);
    } catch (error) {
      logger.error("Error creating category: %o", error);
      res.status(500).json({ message: "Error creating category" });
    }
  },

  // Update a category
  updateCategory: async (req, res) => {
    logger.info("updateCategory function called");
    try {
      const categoryId = req.params.categoryId;
      const { category_name } = req.body;

      // Validate input (you can use a separate validation middleware here)
      if (!category_name) {
        logger.warn("Category name is required");
        return res.status(400).json({ message: "Category name is required" });
      }

      const category = await Category.findByPk(categoryId);
      if (!category) {
        logger.warn("Category not found: %s", categoryId);
        return res.status(404).json({ message: "Category not found" });
      }

      category.category_name = category_name;
      await category.save();

      logger.info("updateCategory function executed successfully");
      res.status(200).json(category);
    } catch (error) {
      logger.error("Error updating category: %o", error);
      res.status(500).json({ message: "Error updating category" });
    }
  },

  // Delete a category
  deleteCategory: async (req, res) => {
    logger.info("deleteCategory function called");
    try {
      const categoryId = req.params.categoryId;

      const category = await Category.findByPk(categoryId);
      if (!category) {
        logger.warn("Category not found: %s", categoryId);
        return res.status(404).json({ message: "Category not found" });
      }

      await category.destroy();
      logger.info("deleteCategory function executed successfully");
      res.status(200).json({ message: "Category deleted" });
    } catch (error) {
      logger.error("Error deleting category: %o", error);
      res.status(500).json({ message: "Error deleting category" });
    }
  },
};

module.exports = categoryController;
