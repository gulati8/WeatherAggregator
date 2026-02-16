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

**Deployment:** Dockerized, deployed to EC2 via GitHub Actions. Caddy reverse proxy handles TLS and routes `/api/*` to backend, everything else to frontend nginx.

**Data sources** (all free, no API keys required):
- Aviation Weather Center (AWC) — METAR, TAF, airport metadata
- Open-Meteo — hourly forecasts (temp, wind, visibility, precipitation)
- National Weather Service (NWS) — alerts, extended forecasts

**Caching:** In-memory via `node-cache` (METAR: 60s, TAF: 10min, airport: 24h).

No database. Trip data stored in browser localStorage.

## Commands

### Backend (`cd backend/`)
- **Install:** `npm install`
- **Dev:** `npm run dev` (ts-node-dev, hot reload, port 3002)
- **Build:** `npm run build` (tsc → `dist/`)
- **Start:** `npm start` (runs compiled JS)
- **Lint:** `npm run lint`

### Frontend (`cd frontend/`)
- **Install:** `npm install`
- **Dev:** `npm run dev` (Vite dev server, port 5173, proxies `/api` to backend)
- **Build:** `npm run build` (tsc + vite build → `dist/`)
- **Lint:** `npm run lint`

### Docker
- **Dev:** `docker compose up` (from repo root)
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
| `backend/src/index.ts` | Express app entry point |
| `backend/src/services/weather-aggregator.ts` | Core aggregation logic (~815 lines) |
| `backend/src/services/aviation-weather.ts` | AWC API client |
| `backend/src/services/open-meteo.ts` | Open-Meteo API client |
| `backend/src/services/nws.ts` | NWS API client |
| `backend/src/services/part135-checker.ts` | FAA Part 135 compliance |
| `backend/src/services/trip-service.ts` | Multi-leg trip planning |
| `frontend/src/pages/AirportWeather.tsx` | Main weather dashboard |
| `frontend/src/pages/TripPlanner.tsx` | Trip planning page |
| `frontend/src/hooks/useWeather.ts` | Weather fetch + favorites + recent |

## API Endpoints

- `GET /api/weather/:icao` — Aggregated weather for an airport
- `GET /api/weather/:icao/raw` — Raw METAR/TAF text
- `GET /api/weather/:icao/metar` — Parsed METAR only
- `GET /api/weather/:icao/taf` — Parsed TAF only
- `POST /api/trip` — Multi-leg trip weather planning
- `GET /health` — Health check

## CI/CD

Push to `main` triggers `.github/workflows/deploy.yml`:
1. Builds Docker images for frontend + backend
2. Pushes to GHCR (`ghcr.io/gulati8/weatheraggregator-api`, `ghcr.io/gulati8/weatheraggregator-web`)
3. Deploys to EC2 via AWS SSM (pulls images, docker compose up)

**Merging to main auto-deploys to production.**

## Known Issues

- README says port 3001, code uses 3002
- Part 135 alternate check is simplified (uses current conditions, not TAF)
- AVWX weather source configured in types/config but not implemented
- No rate limiting against AWC's 100 req/min limit
- Airport country hardcoded to 'US'
