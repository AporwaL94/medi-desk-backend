const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendors', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      deviceName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      activatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      plan: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'none'
      },
      planStarted: {
        type: DataTypes.DATE,
        allowNull: true
      },
      planExpiry: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'inactive'
      },
      gracePeriodEnd: {
        type: DataTypes.DATE,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastSyncAt: {
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
    await queryInterface.dropTable('vendors');
  }
};
