const dbConfig = require("../config/dbConfig.js");
const { Sequelize, DataTypes } = require("sequelize");

// Setup Sequelize connection using dbConfig
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port, // Include the port here
    dialect: dbConfig.dialect,
    define: {
      freezeTableName: true, // Prevents Sequelize from pluralizing table names
      underscored: true, // Use snake_case for fields
      tableName: undefined, // Let each model define its own table name
    },
  }
);
// Test DB connection
sequelize
  .authenticate()
  .then(() => console.log("Connection has been established successfully."))
  .catch((err) => console.error("Unable to connect to the database:", err));

// Initialize the db object
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Load models (Order matters for foreign key constraints)
db.permissions = require("./permissionModel.js")(sequelize, DataTypes);
db.roles = require("./roleModel.js")(sequelize, DataTypes);
db.users = require("./userModel.js")(sequelize, DataTypes);
db.customers = require("./customerModel.js")(sequelize, DataTypes);
db.distributors = require("./distributorModel.js")(sequelize, DataTypes);
db.skills = require("./skillModel.js")(sequelize, DataTypes);
db.freelancers = require("./freelancerModel.js")(sequelize, DataTypes);
db.consultants = require("./consultantModel.js")(sequelize, DataTypes);
db.rolePermissions = require("./rolePermissionModel.js")(sequelize, DataTypes);
db.products = require("./productModel.js")(sequelize, DataTypes);
db.competitivePrices = require("./competitivePricesModel.js")(
  sequelize,
  DataTypes
);
db.categories = require("./categoryModel.js")(sequelize, DataTypes);
db.quotationItems = require("./quotationItemModel.js")(sequelize, DataTypes);
db.quotations = require("./quotationModel.js")(sequelize, DataTypes);
db.orders = require("./orderModel.js")(sequelize, DataTypes);
db.invoices = require("./invoiceModel.js")(sequelize, DataTypes);
db.subscriptionpacks = require("./subscriptionpackModel.js")(
  sequelize,
  DataTypes
);
db.subscriptions = require("./subscriptionModel.js")(sequelize, DataTypes);
db.tickets = require("./ticketModel.js")(sequelize, DataTypes);
db.carts = require("./cartModel.js")(sequelize, DataTypes);
db.cartItem = require("./cartItemModel.js")(sequelize, DataTypes);
db.freelancerSkills = require("./freelancerSkillModel.js")(
  sequelize,
  DataTypes
);
db.freelancerCertificates = require("./freelancerCertificateModel.js")(
  sequelize,
  DataTypes
);
db.payments = require("./paymentModel.js")(sequelize, DataTypes);
db.pendingRegistrations = require("./pendingRegistrationModel.js")(
  sequelize,
  DataTypes
);
db.notifications = require("./notificationModel.js")(sequelize, DataTypes);

// Define model associations (Define associations BEFORE sync)
db.users.belongsTo(db.roles, { foreignKey: "role_id" });
db.roles.hasMany(db.users, { foreignKey: "role_id" });

db.tickets.belongsTo(db.skills, { foreignKey: "skill_id" });
db.skills.hasMany(db.tickets, { foreignKey: "skill_id" });

db.users.hasOne(db.customers, { foreignKey: "user_id" });
db.customers.belongsTo(db.users, { foreignKey: "user_id" });

db.users.hasOne(db.distributors, { foreignKey: "user_id" });
db.users.hasOne(db.freelancers, { foreignKey: "user_id" });
db.users.hasOne(db.consultants, { foreignKey: "user_id" });

// Add the one-to-one association between User and Subscription
db.subscriptions.belongsTo(db.users, { foreignKey: "user_id" });
db.users.hasOne(db.subscriptions, { foreignKey: "user_id" });

// Product associations
db.products.belongsTo(db.categories, { foreignKey: "category_id" });
db.categories.hasMany(db.products, { foreignKey: "category_id" });

db.products.hasMany(db.competitivePrices, {
  foreignKey: "product_id",
});
db.competitivePrices.belongsTo(db.products, {
  foreignKey: "product_id",
});

db.distributors.hasMany(db.competitivePrices, { foreignKey: "distributor_id" });
db.competitivePrices.belongsTo(db.distributors, {
  foreignKey: "distributor_id",
});

// Distributor associations
db.distributors.belongsTo(db.users, { foreignKey: "user_id" });

// Order associations
db.orders.belongsTo(db.quotations, { foreignKey: "quotation_id" });
db.quotations.hasOne(db.orders, { foreignKey: "quotation_id" });

// Invoice associations
db.invoices.belongsTo(db.orders, { foreignKey: "order_id" });
db.orders.hasOne(db.invoices, { foreignKey: "order_id" });

// Cart associations
// A user has one cart (one-to-one)
db.users.hasOne(db.carts, { foreignKey: "user_id", onDelete: "CASCADE" });
db.carts.belongsTo(db.users, { foreignKey: "user_id" });
// A cart has many cart items (one-to-many)
db.carts.hasMany(db.cartItem, { foreignKey: "cart_id", onDelete: "CASCADE" });
db.cartItem.belongsTo(db.carts, { foreignKey: "cart_id" });
// A product is associated with multiple cart items (one-to-many)
db.products.hasMany(db.cartItem, {
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
db.cartItem.belongsTo(db.products, { foreignKey: "product_id" });

// Ticket associations
db.tickets.belongsTo(db.users, { foreignKey: "user_id", as: "User" });

// Freelancer associations
db.freelancers.belongsTo(db.users, { foreignKey: "user_id" });
db.users.hasOne(db.freelancers, { foreignKey: "user_id" });

// Many-to-Many Role-Permission Relationship
db.roles.belongsToMany(db.permissions, {
  through: db.rolePermissions,
  foreignKey: "role_id",
});
db.permissions.belongsToMany(db.roles, {
  through: db.rolePermissions,
  foreignKey: "permissions_id",
});

db.freelancers.belongsToMany(db.skills, {
  through: db.freelancerSkills,
  foreignKey: "freelancer_id",
  otherKey: "skill_id",
  as: "skills", // Changed from 'Skills' to 'skills'
});

db.skills.belongsToMany(db.freelancers, {
  through: db.freelancerSkills,
  foreignKey: "skill_id",
  otherKey: "freelancer_id",
  as: "freelancers",
});

db.freelancers.hasMany(db.freelancerCertificates, {
  foreignKey: "freelancer_id",
  onDelete: "CASCADE",
});
db.freelancerCertificates.belongsTo(db.freelancers, {
  foreignKey: "freelancer_id",
});

// Each SubscriptionPack can have many Subscriptions.
db.subscriptionpacks.hasMany(db.subscriptions, {
  foreignKey: "subscriptionpack_id",
});
db.subscriptions.belongsTo(db.subscriptionpacks, {
  foreignKey: "subscriptionpack_id",
});

// Each Subscription can have many Tickets.
db.subscriptions.hasMany(db.tickets, {
  foreignKey: "subscription_id",
});
db.tickets.belongsTo(db.subscriptions, {
  foreignKey: "subscription_id",
});

db.users.hasMany(db.subscriptions, { foreignKey: "user_id" });
db.subscriptions.belongsTo(db.users, { foreignKey: "user_id" });

// Add these associations after your existing associations
db.pendingRegistrations.belongsTo(db.roles, { foreignKey: "role_id" });
db.roles.hasMany(db.pendingRegistrations, { foreignKey: "role_id" });

// If applicable, set up Freelancer and Skill associations for Tickets
db.freelancers.hasMany(db.tickets, {
  foreignKey: "assigned_freelancer_id",
  as: "assignedTickets",
});
db.tickets.belongsTo(db.freelancers, {
  foreignKey: "assigned_freelancer_id",
  as: "assignedFreelancer",
});

db.skills.hasMany(db.tickets, {
  foreignKey: "skill_id",
  as: "tickets",
});
db.tickets.belongsTo(db.skills, {
  foreignKey: "skill_id",
  as: "skill",
});
// Payment associations
db.payments.belongsTo(db.users, { foreignKey: "user_id" });
db.users.hasMany(db.payments, { foreignKey: "user_id" });

db.payments.belongsTo(db.subscriptionpacks, {
  foreignKey: "subscriptionpack_id",
});
db.subscriptionpacks.hasMany(db.payments, {
  foreignKey: "subscriptionpack_id",
});

db.quotations.hasMany(db.quotationItems, {
  foreignKey: "quotation_id",
  onDelete: "CASCADE",
});
db.quotations.belongsTo(db.users, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
});
db.users.hasMany(db.quotations, {
  foreignKey: "user_id",
});
db.quotationItems.belongsTo(db.quotations, {
  foreignKey: "quotation_id",
  onDelete: "CASCADE",
});
db.quotationItems.belongsTo(db.products, {
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
db.products.hasMany(db.quotationItems, {
  foreignKey: "product_id",
  onDelete: "CASCADE",
});


db.notifications.belongsTo(db.users, { foreignKey: "user_id" });
db.users.hasMany(db.notifications, { foreignKey: "user_id" });

db.sequelize
  .query("SET FOREIGN_KEY_CHECKS = 0")
  .then(() => db.sequelize.sync({alter:false })) // Sync all tables
  .then(() => db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1"))
  .then(() => {
    console.log("All tables dropped successfully.");
    return db.sequelize.sync({ force: false }); // Re-sync the database //keep it false
  })
  .then(() => {
    console.log("Database synchronized.");// Sync all tables
  })
  .catch((err) => {
    console.error("Error synchronizing database:", err);
  });

module.exports = db;
