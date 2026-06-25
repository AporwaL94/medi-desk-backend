import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize';
import { Vendor } from './vendor.model';

export class VendorInvoice extends Model<InferAttributes<VendorInvoice>, InferCreationAttributes<VendorInvoice>> {
  declare id: CreationOptional<string>;
  declare vendorId: string;
  declare localId: string;
  declare invoiceNumber: string;
  declare totalAmount: number;
  declare customerName: string | null;
  declare customerPhone: string | null;
  declare items: object[];
  declare invoiceCreatedAt: Date;
  declare remoteUpdatedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {
    VendorInvoice.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
  }
}

export function initVendorInvoice(sequelize: Sequelize) {
  VendorInvoice.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendorId: { type: DataTypes.UUID, allowNull: false },
    localId: { type: DataTypes.STRING, allowNull: false },
    invoiceNumber: { type: DataTypes.STRING, allowNull: false },
    totalAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    customerName: DataTypes.STRING,
    customerPhone: DataTypes.STRING,
    items: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    invoiceCreatedAt: { type: DataTypes.DATE, allowNull: false },
    remoteUpdatedAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    tableName: 'vendor_invoices',
    indexes: [{ unique: true, fields: ['vendorId', 'localId'] }]
  });
}
