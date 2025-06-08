const logger = require("../utils/logger");
const db = require("../models");
const { Op } = require("sequelize");
const Freelancer = db.freelancers;
const User = db.users;

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      include: [
        {
          model: db.freelancers,
          attributes: ["experience"],
        },
      ],
      attributes: ["name", "email", "mobile_no", "address"],
    });

    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const profile = {
      name: user.name,
      email: user.email,
      mobile_no: user.mobile_no,
      address: user.address,
      experience: user.freelancer?.experience,
    };

    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, mobile_no, address, experience } = req.body;

    await db.sequelize.transaction(async (t) => {
      // Update user table
      await User.update(
        { name, mobile_no, address },
        { where: { user_id: req.user.user_id }, transaction: t }
      );

      // Update freelancer table
      await Freelancer.update(
        { experience },
        { where: { user_id: req.user.user_id }, transaction: t }
      );
    });

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

exports.getFreelancerSkills = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get freelancer record
    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    // Get skills with a different query approach
    const skills = await db.sequelize.query(
      `SELECT s.skill_id, s.skill_name 
       FROM skills s
       INNER JOIN freelancerSkills fs ON s.skill_id = fs.skill_id
       WHERE fs.freelancer_id = :freelancer_id`,
      {
        replacements: { freelancer_id: freelancer.freelancer_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json(skills);
  } catch (error) {
    console.error("Error fetching freelancer skills:", error);
    res.status(500).json({
      message: "Error fetching skills",
      error: error.message,
    });
  }
};

exports.getFreelancerCertificates = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    const certificates = await db.freelancerCertificates.findAll({
      where: { freelancer_id: freelancer.freelancer_id },
      attributes: ["certificate_id", "certificate_url"],
    });

    res.json(certificates);
  } catch (error) {
    console.error("Error fetching freelancer certificates:", error);
    res.status(500).json({
      message: "Error fetching certificates",
      error: error.message,
    });
  }
};

exports.requestNewSkill = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { skill_id } = req.body;

    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    // Create a pending skill request
    await db.freelancerSkillRequests.create({
      freelancer_id: freelancer.freelancer_id,
      skill_id,
      status: "pending",
    });

    res.status(200).json({ message: "Skill request submitted for approval" });
  } catch (error) {
    logger.error("Error requesting new skill:", error);
    res.status(500).json({ message: "Error submitting skill request" });
  }
};

exports.requestNewCertificate = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const certificate = req.file;

    if (!certificate) {
      return res.status(400).json({ message: "No certificate file provided" });
    }

    const freelancer = await db.freelancers.findOne({
      where: { user_id },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(certificate.path);

    // Create pending certificate request
    await db.freelancerCertificateRequests.create({
      freelancer_id: freelancer.freelancer_id,
      certificate_url: result.secure_url,
      certificate_public_id: result.public_id,
      status: "pending",
    });

    res.status(200).json({ message: "Certificate submitted for approval" });
  } catch (error) {
    logger.error("Error uploading certificate:", error);
    res.status(500).json({ message: "Error uploading certificate" });
  }
};

exports.getFreelancerProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const profile = await db.users.findOne({
      where: { user_id },
      attributes: ["name", "email", "mobile_no", "address"],
      include: [
        {
          model: db.freelancers,
          attributes: ["freelancer_id", "experience"],
          include: [
            {
              model: db.skills,
              through: { attributes: [] }, // Exclude junction table attributes
              as: "skills",
              attributes: ["skill_id", "skill_name"],
            },
          ],
        },
      ],
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching freelancer profile:", error);
    res.status(500).json({
      message: "Error fetching profile",
      error: error.message,
    });
  }
};
