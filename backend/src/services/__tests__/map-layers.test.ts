import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';

// ---------------------------------------------------------------------------
// Mock config and https
// ---------------------------------------------------------------------------

let mockApiKey = '';

vi.mock('../../config', () => ({
  config: {
    owm: {
      get apiKey() { return mockApiKey; },
    },
    apis: {
      aviationWeather: { baseUrl: 'https://aviationweather.gov/api/data' },
      openMeteo: { baseUrl: 'https://api.open-meteo.com/v1' },
      nws: { baseUrl: 'https://api.weather.gov', userAgent: 'test' },
    },
    cache: { metarTtl: 60, tafTtl: 600, airportTtl: 86400 },
    auth: { jwtSecret: 'test', accessTokenExpiry: '15m', bcryptRounds: 12 },
  },
}));

vi.mock('../../services/cache', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(true),
    getMetar: vi.fn().mockResolvedValue(undefined),
    setMetar: vi.fn(),
    getTaf: vi.fn().mockResolvedValue(undefined),
    setTaf: vi.fn(),
    getWeather: vi.fn().mockResolvedValue(undefined),
    setWeather: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../services/rate-limiter', () => ({
  awcRateLimiter: { acquire: vi.fn() },
}));

vi.mock('https', () => ({
  default: {
    get: vi.fn(),
  },
}));

import https from 'https';
import mapLayersRouter from '../../routes/map-layers';

// ---------------------------------------------------------------------------
// Test app setup
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use('/api/map', mapLayersRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Map Layers Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiKey = '';
  });

  it('rejects invalid layer names with 400', async () => {
    mockApiKey = 'test-key';
    const app = createApp();
    const res = await request(app).get('/api/map/owm/invalid_layer/5/10/15.png');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid layer');
  });

  it('returns 404 when no OWM API key is configured', async () => {
    mockApiKey = '';
    const app = createApp();
    const res = await request(app).get('/api/map/owm/clouds_new/5/10/15.png');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not configured');
  });

  it('accepts valid layer names and proxies the tile', async () => {
    mockApiKey = 'test-key';

    // Create a readable stream that acts as the upstream response
    vi.mocked(https.get).mockImplementation((_url: unknown, cb: unknown) => {
      const stream = new Readable({ read() { this.push(null); } });
      (stream as unknown as Record<string, unknown>).statusCode = 200;
      (cb as (res: unknown) => void)(stream);
      return { on: vi.fn().mockReturnThis() } as unknown as ReturnType<typeof https.get>;
    });

    const app = createApp();
    const res = await request(app).get('/api/map/owm/clouds_new/5/10/15.png');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['cache-control']).toContain('max-age=600');
  });

  it('passes correct URL with API key to upstream', async () => {
    mockApiKey = 'my-secret-key';

    vi.mocked(https.get).mockImplementation((_url: unknown, cb: unknown) => {
      const stream = new Readable({ read() { this.push(null); } });
      (stream as unknown as Record<string, unknown>).statusCode = 200;
      (cb as (res: unknown) => void)(stream);
      return { on: vi.fn().mockReturnThis() } as unknown as ReturnType<typeof https.get>;
    });

    const app = createApp();
    await request(app).get('/api/map/owm/temp_new/3/4/5.png');

    expect(https.get).toHaveBeenCalled();
    const callUrl = vi.mocked(https.get).mock.calls[0][0] as string;
    expect(callUrl).toContain('my-secret-key');
    expect(callUrl).toContain('temp_new');
    expect(callUrl).toContain('/3/4/5.png');
  });

  it('returns 502 when upstream connection errors', async () => {
    mockApiKey = 'test-key';

    vi.mocked(https.get).mockImplementation((_url: unknown, _cb: unknown) => {
      const mockReq = {
        on: vi.fn((event: string, handler: () => void) => {
          if (event === 'error') {
            // Fire error asynchronously
            Promise.resolve().then(handler);
          }
          return mockReq;
        }),
      };
      return mockReq as unknown as ReturnType<typeof https.get>;
    });

    const app = createApp();
    const res = await request(app).get('/api/map/owm/clouds_new/5/10/15.png');

    expect(res.status).toBe(502);
  });
});
