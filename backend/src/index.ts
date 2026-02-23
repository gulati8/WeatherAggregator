import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { connectRedis, isRedisHealthy } from './services/redis';
import { connectDb, isDbHealthy, runMigrations } from './db/connection';
import weatherRoutes from './routes/weather';
import tripRoutes from './routes/trip';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import favoritesRoutes from './routes/favorites';
import preferencesRoutes from './routes/preferences';
import airportsRoutes from './routes/airports';
import mapLayersRoutes from './routes/map-layers';
import { airportSearch } from './services/airport-search';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());

// Health check
app.get('/health', async (_req, res) => {
  const [redisOk, dbOk] = await Promise.all([
    isRedisHealthy(),
    isDbHealthy(),
  ]);

  const status = redisOk && dbOk ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redisOk ? 'ok' : 'error',
    database: dbOk ? 'ok' : 'error',
  });
});

// API routes
app.use('/api/weather', weatherRoutes);
app.use('/api/trip', tripRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/airports', airportsRoutes);
app.use('/api/map', mapLayersRoutes);

// Error handling
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    // Connect to Redis
    await connectRedis();
    console.log('Redis connected');

    // Connect to database and run migrations
    await connectDb();
    console.log('Database connected');

    await runMigrations();
    console.log('Database migrations complete');

    // Load airport search data
    await airportSearch.init();

    const port = config.port;
    app.listen(port, () => {
      console.log(`Weather Aggregator API running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
