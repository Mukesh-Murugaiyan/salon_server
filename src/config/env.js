const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvs = ['JWT_SECRET'];

// Warn or validate essential variables in production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvs) {
    if (!process.env[envVar]) {
      throw new Error(`CRITICAL CONFIG ERROR: Environment variable ${envVar} is required in production.`);
    }
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/salon_crm',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_production_1234567890',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

module.exports = env;
