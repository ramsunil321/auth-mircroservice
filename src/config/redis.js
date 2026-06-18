const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => console.log('Redis connecting...'));
redis.on('ready', () => console.log('Redis connected and ready'));
redis.on('error', (err) => console.error('Redis error:', err.message));

module.exports = redis;
