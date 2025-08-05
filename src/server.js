require("dotenv").config(); // Load environment variables from .env file

const express = require("express");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const logger = require("./utils/logger");
const db = require("./models");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const initializeRoles = require("./utils/initializeRoles");
const createAdminUser = require("./seeders/createAdmin");
const cleanStaleTickets = require("./jobs/cleanStaleTickets");
const socketConfig = require("./config/socketConfig");
const http = require("http");
// console.log("All environment variables:", process.env);

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in environment variables");
  process.exit(1);
}

const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes"); // Import category routes
const adminRoutes = require("./routes/adminRoutes"); // to import adminRoutes
const productRoutes = require("./routes/productRoutes");
const skillRoutes = require("./routes/skillRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const cartRoutes = require("./routes/cartRoutes");
const initializePermissions = require("./utils/initializePermissions");
const paymentRoutes = require("./routes/paymentRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const orderRoutes = require("./routes/orderRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const freelancerRoutes = require("./routes/freelancerRoutes");
const pushNotificationRoutes = require("./routes/pushNotificationRoutes");
const {
  router: chatbotRoutes,
  initializeChatbot,
} = require("./routes/chatbotRoutes");
const chartRoutes = require("./routes/chartRoutes"); // Import chart routes
// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a write stream for Morgan access logs
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});

const app = express();
const server = http.createServer(app);
const io = socketConfig.init(server);
// Morgan middleware for HTTP request logging
app.use(morgan("combined", { stream: accessLogStream }));

// Development logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-New-Access-Token", "X-Token-Refreshed"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve certificate files from the public directory
app.use("/certificates", express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/product", productRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/password-reset", passwordRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/freelancer", freelancerRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/charts", chartRoutes);
app.use("/api/push", pushNotificationRoutes); // Use chart routes
// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "AVNS Backend API is running successfully",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Additional health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    message: "Something broke!",
    error: process.env.NODE_ENV === "production" ? {} : err,
  });
});

const PORT = process.env.PORT || 8080;

console.log("🔁 Syncing database...");
db.sequelize
  .sync()
  .then(async () => {
    console.log("✅ Database synced");

    try {
      console.log("🛠 Initializing roles...");
      await initializeRoles();
      console.log("✅ Roles initialized");

      console.log("🛠 Initializing permissions...");
      await initializePermissions();
      console.log("✅ Permissions initialized");

      console.log("🛠 Creating admin user...");
      await createAdminUser();
      console.log("✅ Admin user created");

      console.log("🧹 Starting ticket cleanup job...");
      await cleanStaleTickets();
      console.log("✅ Ticket cleanup initialized");

      console.log("🤖 Initializing chatbot...");
      await initializeChatbot(process.env.GOOGLE_API_KEY);
      console.log("✅ Chatbot initialized");

      console.log(`🚀 Starting server on port ${PORT}`);
      server.listen(PORT, () => {
        logger.info(`✅ Server is running on port ${PORT}`);
        console.log(`✅ Server is running on port ${PORT}`);
      });
    } catch (error) {
      console.error("❌ Error during startup:", error);
      logger.error("Error during startup:", error);
    }
  })
  .catch((error) => {
    console.error("❌ Failed to sync database:", error);
    logger.error("Unable to sync database:", error);
    process.exit(1);
  });

