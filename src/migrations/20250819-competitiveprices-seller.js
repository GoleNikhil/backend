/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// 1) Add seller_id column nullable initially
		await queryInterface.addColumn("competitiveprices", "seller_id", {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: { model: "users", key: "user_id" },
			onUpdate: "CASCADE",
			onDelete: "CASCADE",
		});

		// 2) Backfill seller_id from distributors.user_id via distributor_id
		// Works for Postgres/MySQL
		await queryInterface.sequelize.query(`
			UPDATE competitiveprices cp
			SET seller_id = d.user_id
			FROM distributors d
			WHERE cp.distributor_id = d.distributor_id
		`);

		// 3) Set seller_id as NOT NULL
		await queryInterface.changeColumn("competitiveprices", "seller_id", {
			type: Sequelize.INTEGER,
			allowNull: false,
			references: { model: "users", key: "user_id" },
			onUpdate: "CASCADE",
			onDelete: "CASCADE",
		});

		// 4) Drop old foreign key and column distributor_id
		// Try to remove constraint if named by Sequelize; use IF EXISTS compatible for Postgres
		try {
			await queryInterface.removeConstraint(
				"competitiveprices",
				"competitiveprices_distributor_id_fkey"
			);
		} catch (e) {
			// Ignore if constraint name differs; dropping column will drop FK
		}
		await queryInterface.removeColumn("competitiveprices", "distributor_id");

		// 5) Optional: add index on seller_id
		await queryInterface.addIndex("competitiveprices", ["seller_id"], {
			name: "idx_competitiveprices_seller_id",
		});
	},

	async down(queryInterface, Sequelize) {
		// 1) Re-add distributor_id column nullable initially
		await queryInterface.addColumn("competitiveprices", "distributor_id", {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: { model: "distributors", key: "distributor_id" },
			onUpdate: "CASCADE",
			onDelete: "CASCADE",
		});

		// 2) Backfill distributor_id from consultants/distributors via seller user mapping
		await queryInterface.sequelize.query(`
			UPDATE competitiveprices cp
			SET distributor_id = d.distributor_id
			FROM distributors d
			WHERE cp.seller_id = d.user_id
		`);

		// 3) Set distributor_id NOT NULL
		await queryInterface.changeColumn("competitiveprices", "distributor_id", {
			type: Sequelize.INTEGER,
			allowNull: false,
			references: { model: "distributors", key: "distributor_id" },
			onUpdate: "CASCADE",
			onDelete: "CASCADE",
		});

		// 4) Remove seller_id index and column
		try {
			await queryInterface.removeIndex(
				"competitiveprices",
				"idx_competitiveprices_seller_id"
			);
		} catch (e) {}
		await queryInterface.removeColumn("competitiveprices", "seller_id");
	},
};


