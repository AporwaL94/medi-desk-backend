const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendor_products', {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      barcode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      costPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true
      },
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      genericName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      prescriptionRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      gstRate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 12.0
      },
      hsnCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      minStockLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      supplierName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      rackLocation: {
        type: DataTypes.STRING,
        allowNull: true
      },
      packSize: {
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

    await queryInterface.addIndex('vendor_products', ['vendorId', 'localId'], {
      unique: true,
      name: 'vendor_products_vendorId_localId_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vendor_products');
  }
};
