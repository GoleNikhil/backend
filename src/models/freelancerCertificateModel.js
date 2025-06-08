module.exports = (sequelize, DataTypes) => {
  const FreelancerCertificate = sequelize.define("FreelancerCertificate", {
    certificate_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    freelancer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "freelancers",
        key: "freelancer_id",
      },
    },
    certificate_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    certificate_public_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "freelancercertificates",
    
  });

  return FreelancerCertificate;
};
