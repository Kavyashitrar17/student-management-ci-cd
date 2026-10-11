const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { mongoRepository } = require('./repositories/studentRepository');
const { isDatabaseConnected } = require('./config/database');
const { createStudentRoutes } = require('./routes/studentRoutes');
const { notFound, requireDatabase, errorHandler } = require('./middleware/errorHandler');

// Dependencies are injectable so tests can run without any real database.
function createApp({ studentRepository = mongoRepository, dbConnected = isDatabaseConnected } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  // Health check (used by Render and by the demo). 200 = healthy, 503 = database down.
  app.get('/health', (req, res) => {
    const connected = dbConnected();
    res.status(connected ? 200 : 503).json({
      status: connected ? 'ok' : 'degraded',
      database: connected ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api', requireDatabase(dbConnected));
  app.use('/api/students', createStudentRoutes(studentRepository));
  app.use('/api', notFound);

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
