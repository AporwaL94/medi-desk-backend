import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize';
import { Vendor } from './vendor.model';
import { Payment } from './payment.model';


export class ActivationKey extends Model<InferAttributes<ActivationKey>, InferCreationAttributes<ActivationKey>> {
  declare id: CreationOptional<string>;
  declare key: string;
  declare status: CreationOptional<string>;
  declare plan: CreationOptional<string>;
  declare label: string | null;
  declare email: string | null;
  declare shopName: string | null;
  declare vendorId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {
    ActivationKey.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
    ActivationKey.hasMany(Payment, { foreignKey: 'activationKeyId', as: 'payments' });
  }
}

export function initActivationKey(sequelize: Sequelize) {
  ActivationKey.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'unused' },
    plan: { type: DataTypes.STRING, allowNull: false, defaultValue: 'monthly' },
    label: DataTypes.STRING,
    email: DataTypes.STRING,
    shopName: DataTypes.STRING,
    vendorId: DataTypes.UUID,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: 'activation_keys' });
}
