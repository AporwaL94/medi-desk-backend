const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendor_invoices', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'vendors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      localId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false
      },
      totalAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      items: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]'
      },
      invoiceCreatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      remoteUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('vendor_invoices', ['vendorId', 'localId'], {
      unique: true,
      name: 'vendor_invoices_vendorId_localId_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vendor_invoices');
  }
};
