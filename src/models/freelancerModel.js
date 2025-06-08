module.exports = (sequelize, DataTypes) => {
  const Freelancer = sequelize.define(
    "Freelancer",
    {
      freelancer_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      experience: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    { tableName: "freelancers" }
  );

  // Freelancer.associate = (models) => {
  //   Freelancer.belongsToMany(models.skills, {
  //     through: models.freelancerSkills,
  //     foreignKey: "freelancer_id",
  //     otherKey: "skill_id",
  //     as: "skills",
  //   });
  // };

  return Freelancer;
};
