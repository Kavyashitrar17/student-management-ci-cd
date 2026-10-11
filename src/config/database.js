const mongoose = require('mongoose');

// Fail fast (10 s) instead of hanging when Atlas is unreachable.
const CONNECT_OPTIONS = { serverSelectionTimeoutMS: 10000 };

async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(uri, CONNECT_OPTIONS);
}

// Keeps retrying so a short Atlas outage at boot does not kill the service.
async function connectWithRetry(uri, { delayMs = 5000, log = console } = {}) {
  for (;;) {
    try {
      await connectDatabase(uri);
      log.info('MongoDB connected');
      return;
    } catch (err) {
      // Log only the message - never the connection string.
      log.error(`MongoDB connection failed: ${err.message}. Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, connectWithRetry, isDatabaseConnected, disconnectDatabase };
