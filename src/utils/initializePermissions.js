const db = require("../models");

const defaultPermissions = {
  customer: [
    "view_products",
    "place_orders",
    "view_profile",
    "edit_profile",
    "negotiate_quotation",
    "delete_quotation",
    "add_product_to_quotation",
    "create_quotation",
    "get_specific_quotation",
    "get_all_quotations",
    "negotiate_quotation",
    "delete_quotation",
    "cart_addproduct",
    "cart_removeproduct",
    "cart_getproducts",
    "cart_clear",
  ],
  consultant: [
    "view_products",
    "manage_consultations",
    "view_profile",
    "edit_profile",
    "cart_addproduct",
    "cart_removeproduct",
    "cart_getproducts",
    "cart_clear",
  ],
  distributor: [
    "view_products",
    "manage_inventory",
    "view_orders",
    "manage_orders",
    "view_profile",
    "edit_profile",
  ],
  freelancer: [
    "view_products",
    "manage_services",
    "view_profile",
    "edit_profile",
    "accept_ticket",
    "get_available_tickets",
  ],
  superadmin: [
    "manage_users",
    "manage_roles",
    "manage_permissions",
    "manage_products",
    "get_all_orders",
    "manage_orders",
    "view_analytics",
    "manage_system",
    "view_profile",
    "edit_profile",
    "create_category",
    "update_category",
    "delete_category",
    "create_product",
    "update_product",
    "delete_product",
    "create_order",
    "update_order",
    "delete_order",
    "create_user",
    "update_user",
    "delete_user",
    "create_oem",
    "get_all_competitive_prices",
    "review_quotation",
    "final_quotation",
    "create_skill",
    "delete_skill",
    "purchase_subscription",
    "upgrade_subscription",
    "delete_subscription",
    "create_subscription",
    "get_all_subscriptions",
    "approve_registrations",
    "reject_registrations",
    "view_pending_registrations",
    "view_charts"
  ],
};

const initializePermissions = async () => {
  try {
    // First, verify models exist
    if (!db.permissions || !db.roles || !db.rolePermissions) {
      throw new Error("Required models not found in db object");
    }

    // Create permissions
    for (const role in defaultPermissions) {
      const permissions = defaultPermissions[role];

      for (const permissionName of permissions) {
        // Using lowercase model names as defined in db object
        const [permission, created] = await db.permissions.findOrCreate({
          where: { permissions_name: permissionName },
          defaults: {
            permissions_name: permissionName,
          },
        });

        // Get role using lowercase model name
        const roleRecord = await db.roles.findOne({
          where: { role_name: role },
        });

        if (roleRecord) {
          // Create role-permission association
          await db.rolePermissions.findOrCreate({
            where: {
              role_id: roleRecord.role_id,
              permissions_id: permission.permissions_id,
            },
          });

          console.log(
            ` Permission "${permissionName}" assigned to role "${role}"`
          );
        }
      }
    }
    console.log(" All permissions initialized successfully");
  } catch (error) {
    console.error(" Error initializing permissions:", error);
    throw error;
  }
};

module.exports = initializePermissions;
