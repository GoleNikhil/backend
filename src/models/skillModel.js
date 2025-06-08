const Joi = require("joi");
const skillSchema = require("../validations/validateSkillSchema");

module.exports = (sequelize, DataTypes) => {
  const Skill = sequelize.define(
    "Skill",
    {
      skill_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      skill_name: { type: DataTypes.STRING, allowNull: false },
    },
      { tableName: "skills" },
    {
      hooks: {
        beforeValidate: (skill, options) => {
          const { error, value } = skillSchema.validate(skill.dataValues, {
            abortEarly: false,
          });

          if (error) {
            const errors = error.details.map((detail) => detail.message);
            throw new Error(`Skill validation error: ${errors.join(", ")}`);
          }

          // Apply validated values
          Object.assign(skill, value);
        },
      },
    },
  
  );

  return Skill;
};
