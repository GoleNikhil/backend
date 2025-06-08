const logger = require("../utils/logger");
const db = require("../models");
const Skill = db.skills;

const skillController = {
  // Get all skills
  getAllSkills: async (req, res) => {
    logger.info("getAllSkills function called");
    try {
      const skills = await Skill.findAll();
      logger.info("getAllSkills function executed successfully");
      res.status(200).json(skills);
    } catch (error) {
      logger.error("Error getting skills: %o", error);
      res.status(500).json({ message: "Error getting skills" });
    }
  },

  // Get a single skill by ID
  getSkillById: async (req, res) => {
    logger.info("getSkillById function called");
    try {
      const { skillId } = req.params;
      const skill = await Skill.findByPk(skillId);

      if (!skill) {
        logger.warn("Skill not found: %s", skillId);
        return res.status(404).json({ message: "Skill not found" });
      }

      logger.info("getSkillById function executed successfully");
      res.status(200).json(skill);
    } catch (error) {
      logger.error("Error getting skill: %o", error);
      res.status(500).json({ message: "Error getting skill" });
    }
  },

  // Create a new skill
  createSkill: async (req, res) => {
    logger.info("createSkill function called");
    try {
      const { skill_name } = req.body;
      const newSkill = await Skill.create({ skill_name });

      logger.info("createSkill function executed successfully");
      res.status(201).json(newSkill);
    } catch (error) {
      logger.error("Error creating skill: %o", error);
      res.status(500).json({ message: "Error creating skill" });
    }
  },

  // Update a skill
  updateSkill: async (req, res) => {
    logger.info("updateSkill function called");
    try {
      const { skillId } = req.params;
      const { skill_name } = req.body;

      const skill = await Skill.findByPk(skillId);
      if (!skill) {
        logger.warn("Skill not found: %s", skillId);
        return res.status(404).json({ message: "Skill not found" });
      }

      await skill.update({ skill_name });
      logger.info("updateSkill function executed successfully");
      res.status(200).json(skill);
    } catch (error) {
      logger.error("Error updating skill: %o", error);
      res.status(500).json({ message: "Error updating skill" });
    }
  },

  // Delete a skill
  deleteSkill: async (req, res) => {
    logger.info("deleteSkill function called");
    try {
      const { skillId } = req.params;

      const skill = await Skill.findByPk(skillId);
      if (!skill) {
        logger.warn("Skill not found: %s", skillId);
        return res.status(404).json({ message: "Skill not found" });
      }

      await skill.destroy();
      logger.info("deleteSkill function executed successfully");
      res.status(200).json({ message: "Skill deleted" });
    } catch (error) {
      logger.error("Error deleting skill: %o", error);
      res.status(500).json({ message: "Error deleting skill" });
    }
  },
};

module.exports = skillController;
