const db = require("../models");
const logger = require("../utils/logger");
const {
  uploadOnCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");

exports.searchProduct = async (category_id, oem_name, product_name) => {
  try {
    const product = await db.products.findOne({
      where: {
        category_id,
        oem_name,
        product_name,
      },
    });
    return product;
  } catch (error) {
    logger.error(`Error searching product: ${error.message}`);
    throw error;
  }
};

exports.createProduct = async (
  productData,
  distributor_id,
  competitivePrice
) => {
  try {
    // Validate required fields
    const requiredFields = ["oem_name", "product_name", "category_id"];
    const missingFields = requiredFields.filter((field) => !productData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Validate competitive price
    if (!competitivePrice || isNaN(competitivePrice)) {
      throw new Error("Valid competitive price is required");
    }

    // Create product with transaction to ensure data consistency
    const result = await db.sequelize.transaction(async (t) => {
      // Create the product
      const product = await db.products.create(productData, { transaction: t });

      // Create competitive price entry
      const cp = await db.competitivePrices.create(
        {
          product_id: product.product_id,
          distributor_id,
          price: parseFloat(competitivePrice),
        },
        { transaction: t }
      );

      return {
        product: product.toJSON(),
        competitivePrice: cp.toJSON(),
      };
    });

    logger.info("Product created successfully", {
      product_id: result.product.product_id,
      distributor_id,
    });

    return result;
  } catch (error) {
    logger.error("Error creating product:", {
      error: error.message,
      productData,
      distributor_id,
    });
    throw error;
  }
};

exports.addCompetitivePrice = async (product_id, distributor_id, price) => {
  try {
    // Check if price already exists for this distributor
    const existingPrice = await db.competitivePrices.findOne({
      where: {
        product_id,
        distributor_id,
      },
    });

    if (existingPrice) {
      throw new Error("Competitive price already exists for this distributor");
    }

    const cp = await db.competitivePrices.create({
      product_id,
      distributor_id,
      price,
    });

    return cp;
  } catch (error) {
    logger.error(`Error adding competitive price: ${error.message}`);
    throw error;
  }
};

exports.getAllProducts = async () => {
  try {
    const products = await db.products.findAll({
      include: [
        {
          model: db.competitivePrices,
          include: [
            {
              model: db.distributors,
              attributes: ["distributor_id", "user_id"],
            },
          ],
        },
        {
          model: db.categories,
          attributes: ["category_id", "category_name"],
        },
      ],
    });

    return products;
  } catch (error) {
    logger.error("Error fetching all products:", error);
    throw error;
  }
};

exports.getProductById = async (productId) => {
  try {
    const product = await db.products.findByPk(productId, {
      include: [
        {
          model: db.competitivePrices,
          include: [
            {
              model: db.distributors,
              attributes: ["distributor_id", "user_id"],
            },
          ],
        },
        {
          model: db.categories,
          attributes: ["category_id", "category_name"],
        },
      ],
    });

    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  } catch (error) {
    logger.error(`Error fetching product by ID ${productId}:`, error);
    throw error;
  }
};

exports.updateProduct = async (productId, updateData, files, distributorId) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Find product with all associations
    const product = await db.products.findOne({
      where: { product_id: productId },
      include: [
        {
          model: db.competitivePrices,
          as: "CompetitivePrices",
          include: [
            {
              model: db.distributors,
              as: "Distributor",
              attributes: ["distributor_id", "user_id"],
            },
          ],
        },
      ],
      transaction,
    });

    if (!product) {
      await transaction.rollback();
      throw new Error("Product not found");
    }

    // Check if distributor has a competitive price for this product
    const hasCompetitivePrice =
      product.CompetitivePrices &&
      product.CompetitivePrices.some(
        (cp) => cp.distributor_id === distributorId
      );

    if (!hasCompetitivePrice) {
      await transaction.rollback();
      throw new Error(
        "You can only update products that you have added competitive prices for"
      );
    }

    // Check if other distributors have competitive prices
    const hasOtherDistributors =
      product.CompetitivePrices &&
      product.CompetitivePrices.some(
        (cp) => cp.distributor_id !== distributorId
      );

    if (hasOtherDistributors) {
      const restrictedFields = ["product_name", "oem_name", "category_id"];
      const attemptedRestrictedUpdate = restrictedFields.some(
        (field) => field in updateData
      );

      if (attemptedRestrictedUpdate) {
        await transaction.rollback();
        throw new Error(
          "Cannot update core product details when other distributors have competitive prices"
        );
      }
    }

    // Handle file uploads
    let imageUrl = product.image;
    let imagePublicId = product.image_public_id;
    let datasheetUrl = product.datasheet;
    let datasheetPublicId = product.datasheet_public_id;

    if (files?.image) {
      const uploadResult = await uploadOnCloudinary(files.image[0].path);

      if (uploadResult) {
        if (product.image_public_id) {
          await deleteFromCloudinary(product.image_public_id);
        }
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }
    }

    if (files?.datasheet) {
      const uploadResult = await uploadOnCloudinary(files.datasheet[0].path);

      if (uploadResult) {
        if (product.datasheet_public_id) {
          await deleteFromCloudinary(product.datasheet_public_id);
        }
        datasheetUrl = uploadResult.secure_url;
        datasheetPublicId = uploadResult.public_id;
        console.log(
          "Cloudinary upload response:",
          JSON.stringify(uploadResult, null, 2)
        );
      }
    }

    // Update product
    const updatedProduct = await product.update(
      {
        ...updateData,
        image: imageUrl,
        image_public_id: imagePublicId,
        datasheet: datasheetUrl,
        datasheet_public_id: datasheetPublicId,
      },
      { transaction }
    );

    // Update competitive price if provided
    // if (updateData.competitivePrice) {
    //   await db.competitivePrices.update(
    //     { price: updateData.competitivePrice },
    //     {
    //       where: {
    //         product_id: productId,
    //         distributor_id: distributorId
    //       },
    //       transaction
    //     }
    //   );
    // }
    if (updateData.price || updateData.competitivePrice) {
      const priceValue = updateData.price || updateData.competitivePrice;
      const cp = await db.competitivePrices.findOne({
        where: {
          product_id: productId,
          distributor_id: distributorId,
        },
        transaction,
      });

      if (cp) {
        await cp.update({ price: priceValue }, { transaction });
      }
    }
    await transaction.commit();

    // Fetch fresh data with associations
    const freshProduct = await db.products.findOne({
      where: { product_id: productId },
      include: [
        {
          model: db.competitivePrices,
          as: "CompetitivePrices",
          include: [
            {
              model: db.distributors,
              as: "Distributor",
              attributes: ["distributor_id", "user_id"],
            },
          ],
        },
        {
          model: db.categories,
          as: "Category",
          attributes: ["category_id", "category_name"],
        },
      ],
    });

    logger.info(`Product ${productId} updated successfully`);
    return freshProduct;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    logger.error(`Error updating product ${productId}:`, error);
    throw error;
  }
};

exports.getProductsByDistributorId = async (distributor_id) => {
  try {
    const products = await db.products.findAll({
      include: [
        {
          model: db.competitivePrices,
          required: true, // This ensures only products with competitive prices are returned
          where: { distributor_id },
          include: [
            {
              model: db.distributors,
              attributes: [
                "distributor_id",
                "user_id",
                "company_size",
                "gst_type",
              ],
            },
          ],
        },
        {
          model: db.categories,
          attributes: ["category_id", "category_name"],
        },
      ],
      order: [["createdAt", "DESC"]], // Optional: Order by creation date
    });

    if (!products || products.length === 0) {
      throw new Error("No products found for this distributor");
    }

    logger.info(
      `Retrieved ${products.length} products for distributor ${distributor_id}`
    );
    return products;
  } catch (error) {
    logger.error(
      `Error fetching products for distributor ${distributor_id}:`,
      error
    );
    throw error;
  }
};

exports.deleteProduct = async (productId, distributorId) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Find the product
    const product = await db.products.findByPk(
      productId,
      {
        include: [
          {
            model: db.competitivePrices,
            include: [
              {
                model: db.distributors,
                attributes: ["distributor_id"],
              },
            ],
          },
        ],
      },
      { transaction }
    );

    if (!product) {
      throw new Error("Product not found");
    }

    // Count total competitive prices for this product
    const totalCompetitivePrices = product.CompetitivePrices.length;

    if (totalCompetitivePrices > 1) {
      // If multiple competitive prices exist, only delete the distributor's price
      await db.competitivePrices.destroy(
        {
          where: {
            product_id: productId,
            distributor_id: distributorId,
          },
        },
        { transaction }
      );

      await transaction.commit();
      return {
        message: "Competitive price removed successfully",
        remainingPrices: totalCompetitivePrices - 1,
      };
    } else {
      // If this is the only competitive price, delete the entire product
      if (product.image_public_id) {
        await deleteFromCloudinary(product.image_public_id);
      }
      if (product.datasheet_public_id) {
        await deleteFromCloudinary(product.datasheet_public_id);
      }

      await product.destroy({ transaction });
      await transaction.commit();
      return {
        message: "Product deleted successfully",
        remainingPrices: 0,
      };
    }
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error in deleteProduct service: ${error.message}`);
    throw error;
  }
};

exports.getAllProductCategoryWise = async () => {
  try {
    const categories = await db.categories.findAll({
      include: [
        {
          model: db.products,
          as: "Products", // Ensure this alias matches your association in models/index.js
          attributes: [
            "product_id",
            "oem_name",
            "product_name",
            "part_no",
            "HSN_no",
            "description",
            "image",
            "datasheet",
          ],
          order: [
            ["oem_name", "ASC"],
            ["product_name", "ASC"],
          ],
        },
      ],
    });

    if (!categories || categories.length === 0) {
      throw new Error("No categories found");
    }

    logger.info(`Retrieved ${categories.length} categories with products`);
    return categories;
  } catch (error) {
    logger.error(`Error fetching categories with products: ${error.message}`);
    throw error;
  }
};

exports.getAllCompetitivePricesByProductID = async (product_id) => {
  try {
    const product = await db.products.findOne({
      where: { product_id },
      include: [
        {
          model: db.competitivePrices,
          as: "CompetitivePrices",
          include: [
            {
              model: db.distributors,
              as: "Distributor",
              attributes: [
                "distributor_id",
                "user_id",
                "gst_type",
                "company_size",
              ],
              include: [
                {
                  model: db.users,
                  as: "User",
                  attributes: ["name", "email", "mobile_no"],
                },
              ],
            },
          ],
        },
        {
          model: db.categories,
          as: "Category",
          attributes: ["category_id", "category_name"],
        },
      ],
    });

    if (!product) {
      throw new Error("Product not found");
    }

    logger.info(`Retrieved competitive prices for product ${product_id}`);
    return product;
  } catch (error) {
    logger.error(
      `Error fetching competitive prices for product ${product_id}:`,
      error
    );
    throw error;
  }
};
