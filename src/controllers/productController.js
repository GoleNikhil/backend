const productService = require("../services/productService");
const logger = require("../utils/logger");
const db = require("../models");
const { Op } = require("sequelize");
const Product = db.products;
const { uploadOnCloudinary } = require("../utils/cloudinary");
const distributorModel = require("../models/distributorModel");


// Create Product
exports.createProduct = async (req, res) => {
  try {
    const user_id = req.user.user_id;
      // Handle file uploads first
    let imageUrl = null, imagePublicId = null;
    let datasheetUrl = null, datasheetPublicId = null;

    if (req.files?.image) {
      const uploadResult = await uploadOnCloudinary(req.files.image[0].path);
      if (uploadResult) {
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }
    }

    if (req.files?.datasheet) {
      const uploadResult = await uploadOnCloudinary(req.files.datasheet[0].path);
      if (uploadResult) {
        datasheetUrl = uploadResult.secure_url;
        datasheetPublicId = uploadResult.public_id;
      }
    }

    // Validate competitive price
    if (!req.body.competitivePrice) {
      return res.status(400).json({
        success: false,
        message: "Competitive price is required"
      });
    }

    // Parse product data from form
    const productData = {
      oem_name: req.body.oem_name,
      product_name: req.body.product_name,
      category_id: req.body.category_id,
      part_no: req.body.part_no,
      HSN_no: req.body.HSN_no,
      description: req.body.description,
      image: imageUrl,
      image_public_id: imagePublicId || 'default_image_id',
      datasheet: datasheetUrl,
      datasheet_public_id: datasheetPublicId
    };

    // Validate required fields
    const requiredFields = ['oem_name', 'product_name', 'category_id'];
    const missingFields = requiredFields.filter(field => !productData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missingFields
      });
    }

    const result = await productService.createProduct(
      productData,
      user_id,
      req.body.competitivePrice
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: result
    });

  } catch (error) {
    logger.error(`Error creating product: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: "Error creating product",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
logger.info("getAllProducts function called");
  try {
    const products = await productService.getAllProducts();
    
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: products
    });
  } catch (error) {
    logger.error("Error getting products:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving products",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    logger.error("Error getting product:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving product",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const user_id = req.user.user_id;

    // Check if product exists
    const existingProduct = await db.products.findByPk(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Check for unique product name if being updated
    if (req.body.product_name) {
      const duplicateProduct = await db.products.findOne({
        where: {
          product_name: req.body.product_name.trim(),
          product_id: { [Op.ne]: productId }
        }
      });

      if (duplicateProduct) {
        return res.status(400).json({
          success: false,
          message: "Product name must be unique"
        });
      }
    }

    const updatedProduct = await productService.updateProduct(
      productId,
      req.body,
      req.files,
      user_id
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct
    });

  } catch (error) {
    logger.error("Error updating product:", error);

    if (error.message.includes('competitive prices')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};


// Delete Product
exports.deleteProduct = async (req, res) => {
  logger.info("deleteProduct function called");
  try {
    const user_id = req.user.user_id;

    // Check if the distributor has a competitive price for this product
    const hasCompetitivePrice = await db.competitivePrices.findOne({
      where: {
        product_id: req.params.id,
        seller_id: user_id
      }
    });

    if (!hasCompetitivePrice) {
      return res.status(403).json({
        success: false,
        message: "You can only delete products that you have added competitive prices for"
      });
    }

    const result = await productService.deleteProduct(
      req.params.id,
      user_id
    );

    res.status(200).json({
      success: true,
      message: result.message,
      remainingPrices: result.remainingPrices
    });

  } catch (error) {
    logger.error("Error in deleteProduct:", error);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};
// Search product before creation
exports.searchProduct = async (req, res) => {
  try {
    const { category_id, oem_name, product_name } = req.query;

    if (!category_id || !oem_name || !product_name) {
      return res.status(400).json({ 
        message: "Missing required search parameters" 
      });
    }

    const product = await productService.searchProduct(
      category_id, 
      oem_name, 
      product_name
    );

    if (product) {
      return res.status(200).json({
        exists: true,
        product,
        message: "Product found"
      });
    }

    return res.status(404).json({
      exists: false,
      message: "Product not found"
    });

  } catch (error) {
    logger.error(`Error searching product: ${error.message}`);
    return res.status(500).json({ 
      message: "Error searching product",
      error: error.message 
    });
  }
};

// Add competitive price to existing product
exports.addCompetitivePrice = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const product_id = req.params.product_id; 
    const {  price } = req.body;

    const competitivePrice = await productService.addCompetitivePrice(
      product_id,
      user_id,
      price
    );

    res.status(201).json({
      message: "Competitive price added successfully",
      data: competitivePrice
    });

  } catch (error) {
    logger.error(`Error adding competitive price: ${error.message}`);
    res.status(500).json({ 
      message: "Error adding competitive price",
      error: error.message 
    });
  }
};

// Get all products by seller (current user)

exports.getProductsBySellerId = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const products = await productService.getProductsBySellerId(user_id);

    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: {
        seller_id: user_id,
        total_products: Array.isArray(products) ? products.length : 0,
        products: Array.isArray(products) ? products : []
      }
    });

  } catch (error) {
    logger.error("Error fetching distributor products:", error);
    
    // Gracefully return empty list on not found or empty
    if (error.message === 'No products found for this seller') {
      return res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: { seller_id: user_id, total_products: 0, products: [] }
      });
    }

    res.status(500).json({
      success: false,
      message: "Error retrieving seller products",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

exports.getAllProductCategoryWise = async (req, res) => {
  try {
    const categories = await productService.getAllProductCategoryWise();
    res.status(200).json({
      success: true,
      message: "Categories and products retrieved successfully",
      data: categories.map(category => ({
        category_id: category.category_id,
        category_name: category.name,
        total_products: category.Products ? category.Products.length : 0,
        products: category.Products.map(product => ({
          product_id: product.product_id,
          oem_name: product.oem_name,
          product_name: product.product_name,
          part_no: product.part_no,
          HSN_no: product.HSN_no,
          description: product.description,
          image: product.image,
          datasheet: product.datasheet
        }))
      }))
    });
  } catch (error) {
    logger.error("Error getting categories with products:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving categories with products",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

exports.getAllCompetitivePricesByProductID = async (req, res) => {
  try {
    
    const { product_id } = req.params;
    const result = await productService.getAllCompetitivePricesByProductID(product_id);

    res.status(200).json({
      success: true,
      message: "Competitive prices retrieved successfully",
      data: {
        product: {
          product_id: result.product_id,
          product_name: result.product_name,
          oem_name: result.oem_name,
          category: result.Category?.name,
          part_no: result.part_no
        },
        total_sellers: result.CompetitivePrices?.length || 0,
        competitive_prices: result.CompetitivePrices?.map(cp => ({
          seller_id: cp.Seller?.user_id,
          seller_name: cp.Seller?.name,
          email: cp.Seller?.email,
          mobile_no: cp.Seller?.mobile_no,
          price: cp.price,
          last_updated: cp.updatedAt
        })).sort((a, b) => a.price - b.price)
      }
    });

  } catch (error) {
    logger.error("Error fetching competitive prices:", error);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Error retrieving competitive prices",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};






