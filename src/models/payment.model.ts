import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize';
import { Vendor } from './vendor.model';
import { ActivationKey } from './activation-key.model';


export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<string>;
  declare vendorId: string | null;
  declare activationKeyId: string | null;
  declare amount: number;
  declare plan: string;
  declare method: string;
  declare reference: string | null;
  declare paidAt: CreationOptional<Date>;
  declare recordedBy: CreationOptional<string>;
  declare notes: string | null;
  declare durationDays: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {
    Payment.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
    Payment.belongsTo(ActivationKey, { foreignKey: 'activationKeyId', as: 'activationKey' });
  }
}

export function initPayment(sequelize: Sequelize) {
  Payment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendorId: { type: DataTypes.UUID, allowNull: true },
    activationKeyId: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    plan: { type: DataTypes.STRING, allowNull: false },
    method: { type: DataTypes.STRING, allowNull: false },
    reference: DataTypes.STRING,
    paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    recordedBy: { type: DataTypes.STRING, allowNull: false, defaultValue: 'admin' },
    notes: DataTypes.TEXT,
    durationDays: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: 'payments' });
}
