import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize';
import { VendorProduct } from './vendor-product.model';
import { VendorInvoice } from './vendor-invoice.model';
import { Payment } from './payment.model';
import { VendorShop } from './vendor-shop.model';
import { ActivationKey } from './activation-key.model';


export class Vendor extends Model<InferAttributes<Vendor>, InferCreationAttributes<Vendor>> {
  declare id: CreationOptional<string>;
  declare deviceId: string;
  declare deviceName: string | null;
  declare activatedAt: Date | null;
  declare plan: CreationOptional<string>;
  declare planStarted: Date | null;
  declare planExpiry: Date | null;
  declare status: CreationOptional<string>;
  declare gracePeriodEnd: Date | null;
  declare email: string | null;
  declare notes: string | null;
  declare lastSyncAt: Date | null;
  declare syncToMobilePending: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare shop?: any;

  static associate() {
    Vendor.hasMany(VendorProduct, { foreignKey: 'vendorId', as: 'products' });
    Vendor.hasMany(VendorInvoice, { foreignKey: 'vendorId', as: 'invoices' });
    Vendor.hasMany(Payment, { foreignKey: 'vendorId', as: 'payments' });
    Vendor.hasOne(VendorShop, { foreignKey: 'vendorId', as: 'shop' });
    Vendor.hasOne(ActivationKey, { foreignKey: 'vendorId', as: 'activationKey' });
  }
}

export function initVendor(sequelize: Sequelize) {
  Vendor.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    deviceId: { type: DataTypes.STRING, allowNull: false, unique: true },
    deviceName: DataTypes.STRING,
    activatedAt: DataTypes.DATE,
    plan: { type: DataTypes.STRING, allowNull: false, defaultValue: 'none' },
    planStarted: DataTypes.DATE,
    planExpiry: DataTypes.DATE,
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'inactive' },
    gracePeriodEnd: DataTypes.DATE,
    email: DataTypes.STRING,
    notes: DataTypes.TEXT,
    lastSyncAt: DataTypes.DATE,
    syncToMobilePending: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: 'vendors' });
}
