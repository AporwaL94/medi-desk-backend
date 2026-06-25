import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize';
import { Vendor } from './vendor.model';

export class VendorCustomer extends Model<InferAttributes<VendorCustomer>, InferCreationAttributes<VendorCustomer>> {
  declare id: CreationOptional<string>;
  declare vendorId: string;
  declare localId: string;
  declare name: string;
  declare mobile: string | null;
  declare address: string | null;
  declare customerCreatedAt: Date | null;
  declare remoteUpdatedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {
    VendorCustomer.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
  }
}

export function initVendorCustomer(sequelize: Sequelize) {
  VendorCustomer.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendorId: { type: DataTypes.UUID, allowNull: false },
    localId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    mobile: DataTypes.STRING,
    address: DataTypes.STRING,
    customerCreatedAt: DataTypes.DATE,
    remoteUpdatedAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    tableName: 'vendor_customers',
    indexes: [{ unique: true, fields: ['vendorId', 'localId'] }]
  });
}
