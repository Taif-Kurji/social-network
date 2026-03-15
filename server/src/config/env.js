import 'dotenv/config';

const requiredEnv = ['JWT_SECRET'];

function parseClientOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function loadEnv() {
  const {
    NODE_ENV = 'development',
    PORT = '4000',
    MONGODB_URI = 'mongodb://localhost:27017/tdp013-project',
    JWT_SECRET,
    CLIENT_ORIGIN = 'http://127.0.0.1:8080'
  } = process.env;

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    nodeEnv: NODE_ENV,
    port: Number(PORT),
    mongoUri: MONGODB_URI,
    jwtSecret: JWT_SECRET,
    clientOrigins: parseClientOrigins(CLIENT_ORIGIN)
  };
}

export const env = loadEnv();
