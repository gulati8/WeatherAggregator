# Weather Aggregator for Flight Planners

A web application that aggregates weather data from multiple sources and displays visual comparisons to help private jet flight planners make informed dispatch decisions.

Live at: https://weather.gulatilabs.me

## Features

- **Multi-Source Weather Aggregation**: Fetches data from Aviation Weather Center, Open-Meteo, and NWS
- **Source Comparison**: Side-by-side display showing where sources agree or disagree
- **Consensus Analysis**: Confidence scoring based on source agreement
- **Part 135 Compliance**: Go/No-Go indicator with ceiling and visibility minimums, TAF-based alternate analysis
- **Forecast Timeline**: Interactive time-based forecast view with charts
- **Weather Alerts**: Display of SIGMETs, AIRMETs, and NWS warnings
- **Flight Category Display**: Color-coded VFR/MVFR/IFR/LIFR status
- **Multi-Leg Trip Planning**: Plan weather for multi-leg trips with departure times
- **Fuzzy Airport Search**: Search by ICAO code, IATA code, city name, or airport name
- **Interactive Map**: Map view with weather overlays (NEXRAD radar, echo tops, precipitation, clouds, temperature, wind, pressure)
- **User Accounts**: JWT-based auth with RBAC (admin, dispatcher, viewer)
- **Favorites & Preferences**: Save favorite airports and preferences (synced to DB when logged in)
- **Dark Mode**: Full dark mode support

## Architecture

| Component | Stack | Port |
|-----------|-------|------|
| Backend | Express + TypeScript | 3002 |
| Frontend | React 18 + Vite + Tailwind CSS | 5173 (dev) |
| PostgreSQL | User data, trips, favorites | 5432 |
| Redis | Caching, rate limiting | 6379 |

## Quick Start

```bash
# Start PostgreSQL and Redis
docker compose up postgres redis -d

# Backend
cd backend
npm install
npm run db:migrate
npm run db:seed    # Creates admin/dispatcher/viewer test users (password: password123)
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`

## API Endpoints

### Public
| Endpoint | Description |
|----------|-------------|
| `GET /api/weather/:icao` | Aggregated weather data for an airport |
| `GET /api/weather/:icao/raw` | Raw METAR and TAF strings |
| `GET /api/weather/:icao/metar` | METAR data only |
| `GET /api/weather/:icao/taf` | TAF data only |
| `GET /api/weather/:icao/release` | Part 135 flight release document |
| `POST /api/trip` | Multi-leg trip weather planning |
| `GET /api/airports/search?q=` | Fuzzy airport search |
| `GET /health` | Service health check |

### Auth
| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login |
| `POST /api/auth/refresh` | Refresh access token |
| `GET /api/auth/me` | Get profile |

### Authenticated
| Endpoint | Description |
|----------|-------------|
| `GET/POST/DELETE /api/favorites` | Manage favorite airports |
| `GET/PUT /api/preferences` | Manage preferences |
| `GET/POST/PUT/DELETE /api/trip/saved` | Manage saved trips (dispatcher+) |
| `GET /api/users` | List users (admin) |

## Weather Sources

| Source | Data Provided |
|--------|--------------|
| Aviation Weather Center | METAR, TAF, SIGMET, airport metadata |
| Open-Meteo | 16-day hourly forecasts |
| NWS | Alerts, extended forecasts |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (prod) | PostgreSQL connection string |
| `REDIS_URL` | Yes (prod) | Redis connection string |
| `JWT_SECRET` | Yes (prod) | JWT signing secret |
| `OWM_API_KEY` | No | OpenWeatherMap API key for map weather overlays |

## Deployment

Dockerized with 4 services. Push to `main` auto-deploys via GitHub Actions to EC2 with Caddy reverse proxy.

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, React-Leaflet
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL 16, Redis 7
- **Auth**: JWT with refresh token rotation, bcrypt
- **APIs**: Aviation Weather Center, Open-Meteo, NWS, OpenWeatherMap (tiles)
