class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
}

// Blocks /api requests with a clear 503 when the database is not connected.
function requireDatabase(isDatabaseConnected) {
  return (req, res, next) => {
    if (!isDatabaseConnected()) {
      return next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable. Please try again shortly.'));
    }
    next();
  };
}

const DB_NETWORK_ERRORS = ['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'];

// Express recognises error handlers by their 4 parameters - keep `next`.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let body = { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' };

  if (err instanceof ApiError) {
    status = err.status;
    body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    body = { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' };
  } else if (err.type === 'entity.too.large') {
    status = 413;
    body = { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' };
  } else if (err.code === 11000) {
    status = 409;
    body = { code: 'DUPLICATE_ROLL_NUMBER', message: 'A student with this roll number already exists.' };
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    body = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed.',
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    };
  } else if (DB_NETWORK_ERRORS.includes(err.name)) {
    status = 503;
    body = { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable. Please try again shortly.' };
  }

  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    // Full detail goes to the server log only (visible in Render Logs), never to the client.
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status} ${err.name}: ${err.message}`);
  }

  res.status(status).json({ error: body });
}

module.exports = { ApiError, notFound, requireDatabase, errorHandler };
