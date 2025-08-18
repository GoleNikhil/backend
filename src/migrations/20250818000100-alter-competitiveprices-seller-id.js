'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		// Rename distributor_id -> seller_id and update FK to users(user_id)
		const table = 'competitiveprices';
		// Drop existing foreign key if it exists (best-effort)
		try {
			await queryInterface.removeConstraint(table, 'competitiveprices_distributor_id_fkey');
		} catch (e) {}
		try {
			await queryInterface.removeConstraint(table, 'competitiveprices_distributor_id_fk');
		} catch (e) {}
		try {
			await queryInterface.removeIndex(table, ['distributor_id']);
		} catch (e) {}

		// If column exists, rename it; otherwise add new column
		const tableDesc = await queryInterface.describeTable(table);
		if (tableDesc.distributor_id) {
			await queryInterface.renameColumn(table, 'distributor_id', 'seller_id');
		} else if (!tableDesc.seller_id) {
			await queryInterface.addColumn(table, 'seller_id', {
				type: Sequelize.INTEGER,
				allowNull: false,
			});
		}

		// Add new foreign key to users(user_id)
		await queryInterface.addConstraint(table, {
			fields: ['seller_id'],
			type: 'foreign key',
			name: 'competitiveprices_seller_id_fkey',
			references: {
				table: 'users',
				field: 'user_id',
			},
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		});
	},

	async down(queryInterface, Sequelize) {
		const table = 'competitiveprices';
		// Drop new FK
		try {
			await queryInterface.removeConstraint(table, 'competitiveprices_seller_id_fkey');
		} catch (e) {}

		const tableDesc = await queryInterface.describeTable(table);
		if (tableDesc.seller_id && !tableDesc.distributor_id) {
			await queryInterface.renameColumn(table, 'seller_id', 'distributor_id');
		}

		// Restore FK to distributors(distributor_id) if table exists
		await queryInterface.addConstraint(table, {
			fields: ['distributor_id'],
			type: 'foreign key',
			name: 'competitiveprices_distributor_id_fkey',
			references: {
				table: 'distributors',
				field: 'distributor_id',
			},
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		});
	},
};


