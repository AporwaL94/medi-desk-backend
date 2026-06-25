const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendor_shops', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'vendors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      shopName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      whatsappNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      upiId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      gstin: {
        type: DataTypes.STRING,
        allowNull: true
      },
      logoUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      footerMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      dlNumber: {
        type: DataTypes.STRING,
        allowNull: true
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vendor_shops');
  }
};
