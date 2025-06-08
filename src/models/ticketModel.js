// models/Ticket.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Ticket = sequelize.define("Ticket", {
    ticket_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "subscriptions",
        key: "subscription_id",
      },
      allowNull: false,
    },
    ticket_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ticket_status: {
      type: DataTypes.ENUM(
        "open",
        "inProgress",
        "resolved",
        "unresolved",
        "cancel",
        "pending_admin_review"
      ),
      allowNull: false,
      defaultValue: "open",
    },
    // New field for freelancer notes
    freelancer_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // For admin to determine how many calls to deduct
    calls_deducted: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    // New field to lock the ticket to a freelancer once accepted
    assigned_freelancer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "freelancers", // Ensure this matches your Freelancer model name
        key: "freelancer_id",
      },
    },
    // Optional: Field to indicate the skill associated with the ticket
    skill_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "skills",
        key: "skill_id",
      },
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    // Flag to indicate whether the subscription call charge has been applied
    isCharged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Add this field to your ticket model definition
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "tickets", // Use snake_case for column names
  });

  return Ticket;
};
