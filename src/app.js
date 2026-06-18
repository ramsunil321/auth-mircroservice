require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const prisma = require('./config/db');
const redis = require('./config/redis');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const seedAdmin = require('./config/seed');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedAdmin();
});

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\nReceived kill signal, shutting down gracefully...');
  server.close(async () => {
    console.log('Closed out remaining connections.');
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected.');
    } catch (err) {
      console.error('Error disconnecting Prisma:', err.message);
    }
    try {
      await redis.quit();
      console.log('Redis disconnected.');
    } catch (err) {
      console.error('Error disconnecting Redis:', err.message);
    }
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
