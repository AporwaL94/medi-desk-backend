require('dotenv').config();
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 'sqlite://database.sqlite';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let config;

if (isPostgres) {
  config = {
    url: dbUrl,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  };
} else {
  const storage = dbUrl.startsWith('sqlite://')
    ? dbUrl.replace('sqlite://', '')
    : 'database.sqlite';

  config = {
    dialect: 'sqlite',
    storage: path.isAbsolute(storage) ? storage : path.resolve(process.cwd(), storage),
    logging: false
  };
}

module.exports = {
  development: config,
  production: config
};
