const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer.middleware");
const authenticate = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/checkPermission");
const {
  createProduct,
  addCompetitivePrice,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProduct,
  getProductsByDistributorId, // Add this
  getAllProductCategoryWise, // Add this
  getAllCompetitivePricesByProductID, // Add this
} = require("../controllers/productController");

// Search product before creation
router.get("/search", authenticate, searchProduct);

// Create new product with competitive price
router.post("/create", authenticate, upload, createProduct);

// Add competitive price to existing product
router.post("/competitive-price/:product_id", authenticate, addCompetitivePrice);

// Get products by distributor ID (place before /:id route to avoid conflicts)
router.get("/distributor/my-products", authenticate, getProductsByDistributorId);

// Get all products by category (public route - no authentication needed)
router.get("/category", getAllProductCategoryWise);

// Get all competitive prices for a product (superadmin only)
router.get(
  "/competitive-prices/:product_id",
  authenticate,
  getAllCompetitivePricesByProductID
);

// Existing routes
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.patch("/:id", upload, authenticate, updateProduct);
router.delete("/:id", authenticate,deleteProduct);

//getAllCompetitivePricesByProductID

module.exports = router;
