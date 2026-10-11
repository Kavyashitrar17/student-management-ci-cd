require('dotenv').config({ quiet: true }); // reads .env locally; on Render the variables come from the dashboard

const { createApp } = require('./app');
const { connectWithRetry, disconnectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set. See .env.example.');
  process.exit(1);
}

const app = createApp();

// Bind the port first so Render detects the service, then connect to Atlas.
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  connectWithRetry(MONGODB_URI);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await disconnectDatabase().catch(() => {});
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
