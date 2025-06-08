const socketIO = require("socket.io");
const logger = require("../utils/logger");

let io;

module.exports = {
  init: (server) => {
    io = socketIO(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      logger.info("New client connected", { socketId: socket.id });

      socket.on("freelancerLogin", (freelancerId) => {
        logger.info("Freelancer logged in", {
          freelancerId,
          socketId: socket.id,
        });
        socket.join(`freelancer-${freelancerId}`);
      });

      socket.on("disconnect", () => {
        logger.info("Client disconnected", { socketId: socket.id });
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized");
    }
    return io;
  },
};