# CLAUDE.md

## Project Overview

WeatherAggregator is a flight planning weather app for private jet dispatch. It aggregates weather data from multiple sources (AWC, Open-Meteo, NWS), provides source comparison/consensus analysis, and includes FAA Part 135 GO/NO-GO compliance checking.

Live at: https://weather.gulatilabs.me

## Architecture

**Monorepo** with two packages:

| Package | Stack | Port |
|---------|-------|------|
| `backend/` | Express 4.18 + TypeScript, Node >= 20 | 3002 |
| `frontend/` | React 18 + Vite 5 + Tailwind CSS 3 | 5173 (dev) / 80 (prod nginx) |

**Infrastructure:**
- **PostgreSQL 16** — User accounts, saved trips, favorites, preferences (Drizzle ORM)
- **Redis 7** — Durable caching (replaces in-memory node-cache), rate limiting
- **JWT auth** — Access tokens (15min) + refresh tokens (7d, rotated), bcrypt passwords

**Deployment:** Dockerized (4 services: backend, frontend, postgres, redis), deployed to EC2 via GitHub Actions. Caddy reverse proxy handles TLS and routes `/api/*` to backend, everything else to frontend nginx.

**Data sources** (all free, no API keys required):
- Aviation Weather Center (AWC) — METAR, TAF, airport metadata
- Open-Meteo — hourly forecasts (temp, wind, visibility, precipitation)
- National Weather Service (NWS) — alerts, extended forecasts

**Caching:** Redis-backed (METAR: 60s, TAF: 10min, airport: 24h). Rate limiting also Redis-backed.

**Auth & RBAC:** JWT-based with three roles: admin, dispatcher, viewer. Weather endpoints are public. Trip CRUD requires dispatcher+. User management requires admin. Anonymous users fall back to localStorage for favorites/trips/preferences.

## Commands

### Backend (`cd backend/`)
- **Install:** `npm install`
- **Dev:** `npm run dev` (ts-node-dev, hot reload, port 3002)
- **Build:** `npm run build` (tsc → `dist/`)
- **Start:** `npm start` (runs compiled JS)
- **Lint:** `npm run lint`
- **DB Generate:** `npm run db:generate` (generate Drizzle migrations)
- **DB Migrate:** `npm run db:migrate` (run migrations)
- **DB Seed:** `npm run db:seed` (create initial admin user)

### Frontend (`cd frontend/`)
- **Install:** `npm install`
- **Dev:** `npm run dev` (Vite dev server, port 5173, proxies `/api` to backend)
- **Build:** `npm run build` (tsc + vite build → `dist/`)
- **Lint:** `npm run lint`

### Docker
- **Dev:** `docker compose up` (from repo root — starts all 4 services)
- **Prod:** `docker compose -f docker-compose.prod.yml up -d`

### Tests
- **No tests exist yet.** No test framework installed.

## Code Style

- TypeScript strict mode in both packages
- Backend: CommonJS modules (ES2022 target)
- Frontend: ESNext modules, React functional components with hooks
- Tailwind for styling with custom flight category colors (VFR/MVFR/IFR/LIFR)

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Express app entry point (connects Redis, DB, runs migrations) |
| `backend/src/config/index.ts` | All configuration (port, cache TTLs, redis, database, auth, APIs) |
| `backend/src/db/schema.ts` | Drizzle schema (users, trips, favorites, preferences, refresh_tokens) |
| `backend/src/db/connection.ts` | PostgreSQL pool + Drizzle instance + migration runner |
| `backend/src/services/redis.ts` | Redis connection singleton (ioredis) |
| `backend/src/services/cache.ts` | Redis-backed cache service (async get/set/del) |
| `backend/src/services/rate-limiter.ts` | Redis-backed fixed-window rate limiter |
| `backend/src/services/weather-aggregator.ts` | Core aggregation logic (~815 lines) |
| `backend/src/services/aviation-weather.ts` | AWC API client |
| `backend/src/services/open-meteo.ts` | Open-Meteo API client |
| `backend/src/services/nws.ts` | NWS API client |
| `backend/src/services/part135-checker.ts` | FAA Part 135 compliance |
| `backend/src/services/trip-service.ts` | Multi-leg trip planning |
| `backend/src/services/auth-service.ts` | Register, login, token refresh, logout |
| `backend/src/services/user-service.ts` | User CRUD operations |
| `backend/src/middleware/auth.ts` | authenticate, optionalAuth, requireRole middleware |
| `backend/src/routes/auth.ts` | Auth endpoints (register, login, refresh, logout, profile) |
| `backend/src/routes/users.ts` | Admin user management endpoints |
| `backend/src/routes/favorites.ts` | User favorites CRUD |
| `backend/src/routes/preferences.ts` | User preferences CRUD |
| `frontend/src/contexts/AuthContext.tsx` | Auth state, token management, interceptors |
| `frontend/src/pages/Login.tsx` | Login page |
| `frontend/src/pages/Register.tsx` | Registration page |
| `frontend/src/components/ProtectedRoute.tsx` | Route guard for auth/roles |
| `frontend/src/pages/AirportWeather.tsx` | Main weather dashboard |
| `frontend/src/pages/TripPlanner.tsx` | Trip planning page |
| `frontend/src/hooks/useWeather.ts` | Weather fetch + favorites + recent (dual localStorage/API) |
| `frontend/src/hooks/useTrip.ts` | Trip management (dual localStorage/API) |
| `frontend/src/hooks/useDarkMode.ts` | Dark mode with server sync |
| `frontend/src/api/client.ts` | Axios client with auth, favorites, preferences, trips APIs |

## API Endpoints

### Public (no auth required)
- `GET /api/weather/:icao` — Aggregated weather for an airport
- `GET /api/weather/:icao/raw` — Raw METAR/TAF text
- `GET /api/weather/:icao/metar` — Parsed METAR only
- `GET /api/weather/:icao/taf` — Parsed TAF only
- `GET /api/weather/:icao/release` — Part 135 flight release document
- `POST /api/trip` — Multi-leg trip weather planning
- `GET /health` — Health check (includes redis + database status)

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login, get tokens
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout (authenticated)
- `GET /api/auth/me` — Get profile (authenticated)
- `PUT /api/auth/me` — Update profile (authenticated)
- `PUT /api/auth/password` — Change password (authenticated)

### User Data (authenticated)
- `GET/POST/DELETE /api/favorites` — Manage favorite airports
- `GET/PUT /api/preferences` — Manage dark mode, recent searches

### Saved Trips (authenticated, dispatcher+)
- `GET /api/trip/saved` — List saved trips
- `POST /api/trip/saved` — Save a trip
- `PUT /api/trip/saved/:tripId` — Update a trip
- `DELETE /api/trip/saved/:tripId` — Delete a trip

### Admin Only
- `GET /api/users` — List all users
- `PUT /api/users/:id/role` — Change user role
- `DELETE /api/users/:id` — Delete user

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes (prod) | `postgres://postgres:devpassword@localhost:5432/weatheraggregator` | PostgreSQL connection string |
| `REDIS_URL` | Yes (prod) | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | Yes (prod) | `dev-jwt-secret-change-in-production` | JWT signing secret |
| `POSTGRES_PASSWORD` | Yes (prod) | — | PostgreSQL password (docker-compose) |
| `PORT` | No | `3002` | Backend port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin |

## CI/CD

Push to `main` triggers `.github/workflows/deploy.yml`:
1. Builds Docker images for frontend + backend
2. Pushes to GHCR (`ghcr.io/gulati8/weatheraggregator-api`, `ghcr.io/gulati8/weatheraggregator-web`)
3. Verifies `.env` exists on EC2 (must contain POSTGRES_PASSWORD, JWT_SECRET)
4. Deploys to EC2 via AWS SSM (pulls images, docker compose up)

**Merging to main auto-deploys to production.**

## Known Issues

- README says port 3001, code uses 3002
- Part 135 alternate check is simplified (uses current conditions, not TAF)
- AVWX weather source configured in types/config but not implemented
- Airport country hardcoded to 'US'
