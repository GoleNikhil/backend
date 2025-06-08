const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skillController");
const { checkPermission } = require("../middleware/checkPermission");
const authenticate = require("../middleware/authMiddleware");
// Get all skills
router.get("/", skillController.getAllSkills);

// Get a single skill by ID
router.get("/:skillId", skillController.getSkillById);

// Create a new skill
router.post("/", skillController.createSkill);

// Update an existing skill
router.put("/:skillId", skillController.updateSkill);

// Delete a skill
router.delete("/:skillId", skillController.deleteSkill);

module.exports = router;
