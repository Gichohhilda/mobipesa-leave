require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes  = require('./routes/auth.routes');
const meRoutes  = require('./routes/me.routes');
const applicationsRoutes = require('./routes/applications.routes');
const managerRoutes = require('./routes/manager.routes');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/manager', managerRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
});

app.listen(PORT, () => {
  console.log(`Mobipesa Leave API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;