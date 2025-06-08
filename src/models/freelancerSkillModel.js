module.exports = (sequelize, DataTypes) => {
  const FreelancerSkill = sequelize.define("FreelancerSkill", {
    freelancer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: "freelancers",
        key: "freelancer_id"
      }
    },
    skill_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: "skills",
        key: "skill_id"
      }
    }
  },
  {
    tableName: "freelancerskills",
  });

  // FreelancerSkill.associate = (models) => {
  //   FreelancerSkill.belongsTo(models.skills, {
  //     foreignKey: 'skill_id',
  //     as: 'skill'
  //   });
  // };

  return FreelancerSkill;
};

