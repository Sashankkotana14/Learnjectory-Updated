
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

require('./database/db');

const app = express();

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin'
  });
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : true
  }),
  express.json({ limit: '100kb' })
);

// API health check
app.get('/api/health', (_, res) => res.json({ ok: true }));

// API routes
app.use('/api', require('./routes/api'));

// Serve the built React frontend
const frontendPath = path.join(__dirname, '../frontend/dist');

app.use(express.static(frontendPath));

// React Router fallback: send frontend routes to index.html.
// Do not send API requests to the frontend.
app.get('*', (req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Error handler
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The upload is too large' });
  }

  if (err && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: err.type === 'entity.parse.failed'
        ? 'Invalid JSON body'
        : 'Bad request'
    });
  }

  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log('Learnjectory running on port ' + port);
  });
}
