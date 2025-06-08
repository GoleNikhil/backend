const io = require("socket.io-client");
const logger = require("../utils/logger");

const SOCKET_URL = "http://localhost:8080";

console.log("Starting Socket.IO client simulator");

const socket = io(SOCKET_URL);

const simulateFreelancerLogin = (freelancerId = "4") => {
  socket.emit("freelancerLogin", freelancerId);
  console.log(`Simulated login for freelancer: ${freelancerId}`);
};

// Listen for new tickets
socket.on("newTicket", (data) => {
  console.log("New ticket notification received");
  console.table(data);
});

// Handle connection events
socket.on("connect", () => {
  console.log("Connected to server");
  simulateFreelancerLogin();
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

// This makes keep process running
process.stdin.resume();
console.log("Press Ctrl + C for exit");