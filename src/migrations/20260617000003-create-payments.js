const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
      activationKeyId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'activation_keys',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      plan: {
        type: DataTypes.STRING,
        allowNull: false
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false
      },
      reference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      recordedBy: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'admin'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      durationDays: {
        type: DataTypes.INTEGER,
        allowNull: false
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
    await queryInterface.dropTable('payments');
  }
};
