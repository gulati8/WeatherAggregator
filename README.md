# Weather Aggregator for Flight Planners

A web application that aggregates weather data from multiple sources and displays visual comparisons to help private jet flight planners make informed dispatch decisions.

## Features

- **Multi-Source Weather Aggregation**: Fetches data from Aviation Weather Center, Open-Meteo, and NWS
- **Source Comparison**: Side-by-side display showing where sources agree or disagree
- **Consensus Analysis**: Confidence scoring based on source agreement
- **Part 135 Compliance**: Go/No-Go indicator with ceiling and visibility minimums checking
- **Forecast Timeline**: Interactive time-based forecast view with charts
- **Weather Alerts**: Display of SIGMETs, AIRMETs, and NWS warnings
- **Flight Category Display**: Color-coded VFR/MVFR/IFR/LIFR status

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:3002`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weather/:icao` | Aggregated weather data for an airport |
| `GET /api/weather/:icao/raw` | Raw METAR and TAF strings |
| `GET /api/weather/:icao/metar` | METAR data only |
| `GET /api/weather/:icao/taf` | TAF data only |
| `POST /api/trip` | Multi-leg trip weather planning |
| `GET /health` | Service health check |

## Example Usage

```bash
# Get aggregated weather for JFK
curl http://localhost:3002/api/weather/KJFK

# Get raw METAR/TAF
curl http://localhost:3002/api/weather/KJFK/raw
```

## Weather Sources

| Source | Data Provided | Rate Limit |
|--------|--------------|------------|
| Aviation Weather Center | METAR, TAF, SIGMET | 100 req/min |
| Open-Meteo | 16-day hourly forecasts | Unlimited |
| NWS | Alerts, extended forecasts | Reasonable |

## Flight Categories

- **VFR** (Green): Ceiling > 3000 ft, Visibility > 5 SM
- **MVFR** (Blue): Ceiling 1000-3000 ft, Visibility 3-5 SM
- **IFR** (Red): Ceiling 500-999 ft, Visibility 1-3 SM
- **LIFR** (Purple): Ceiling < 500 ft, Visibility < 1 SM

## Part 135 Minimums

- **Standard Ceiling**: 500 ft AGL
- **Standard Visibility**: 1.0 SM
- **Alternate Required**: When ceiling < 2000 ft or visibility < 3 SM

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, TypeScript
- **APIs**: Aviation Weather Center, Open-Meteo, NWS
