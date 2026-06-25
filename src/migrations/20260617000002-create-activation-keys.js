const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activation_keys', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'unused'
      },
      plan: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'monthly'
      },
      label: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shopName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'vendors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    await queryInterface.dropTable('activation_keys');
  }
};
