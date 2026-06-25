import { Sequelize } from 'sequelize';
import { execSync } from 'child_process';
import { env } from '../config/env';

// Import all models and their initialization functions directly
import { Vendor, initVendor } from './vendor.model';
import { ActivationKey, initActivationKey } from './activation-key.model';
import { Payment, initPayment } from './payment.model';
import { VendorProduct, initVendorProduct } from './vendor-product.model';
import { VendorInvoice, initVendorInvoice } from './vendor-invoice.model';
import { VendorShop, initVendorShop } from './vendor-shop.model';
import { VendorCustomer, initVendorCustomer } from './vendor-customer.model';

const isPostgres = env.databaseUrl.startsWith('postgres://') || env.databaseUrl.startsWith('postgresql://');

export const sequelize = isPostgres
  ? new Sequelize(env.databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  })
  : new Sequelize({
    dialect: 'sqlite',
    storage: env.databaseUrl.startsWith('sqlite://')
      ? env.databaseUrl.replace('sqlite://', '')
      : 'database.sqlite',
    logging: false
  });

function initModels(seq: Sequelize) {
  // Initialize each model schema
  initVendor(seq);
  initActivationKey(seq);
  initPayment(seq);
  initVendorProduct(seq);
  initVendorInvoice(seq);
  initVendorShop(seq);
  initVendorCustomer(seq);

  // Define associations/relations
  Vendor.associate();
  ActivationKey.associate();
  Payment.associate();
  VendorProduct.associate();
  VendorInvoice.associate();
  VendorShop.associate();
  VendorCustomer.associate();
}

export async function initDatabase() {
  initModels(sequelize);

  try {
    console.log('[Database] Running database migrations...');
    const output = execSync('npx --no-install sequelize-cli db:migrate');
    console.log(output.toString());
    console.log('[Database] Database migrations completed successfully.');
  } catch (error) {
    console.error('[Database] Failed to execute database migrations:', error);
    throw error;
  }
}
