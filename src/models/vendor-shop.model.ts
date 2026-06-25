import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize';
import { Vendor } from './vendor.model';

export class VendorShop extends Model<InferAttributes<VendorShop>, InferCreationAttributes<VendorShop>> {
  declare id: CreationOptional<string>;
  declare vendorId: string;
  declare shopName: string | null;
  declare address: string | null;
  declare phone: string | null;
  declare whatsappNumber: string | null;
  declare upiId: string | null;
  declare gstin: string | null;
  declare logoUrl: string | null;
  declare footerMessage: string | null;
  declare dlNumber: string | null;
  declare remoteUpdatedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {
    VendorShop.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
  }
}

export function initVendorShop(sequelize: Sequelize) {
  VendorShop.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendorId: { type: DataTypes.UUID, allowNull: false, unique: true },
    shopName: DataTypes.STRING,
    address: DataTypes.TEXT,
    phone: DataTypes.STRING,
    whatsappNumber: DataTypes.STRING,
    upiId: DataTypes.STRING,
    gstin: DataTypes.STRING,
    logoUrl: DataTypes.TEXT,
    footerMessage: DataTypes.TEXT,
    dlNumber: DataTypes.STRING,
    remoteUpdatedAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: 'vendor_shops' });
}
