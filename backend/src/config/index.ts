export const config = {
  port: process.env.PORT || 3002,
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  cache: {
    metarTtl: 60, // 1 minute
    tafTtl: 600, // 10 minutes
    airportTtl: 86400, // 24 hours
  },
  apis: {
    aviationWeather: {
      baseUrl: 'https://aviationweather.gov/api/data',
    },
openMeteo: {
      baseUrl: 'https://api.open-meteo.com/v1',
    },
    nws: {
      baseUrl: 'https://api.weather.gov',
      userAgent: 'WeatherAggregator/1.0 (weather-aggregator@example.com)',
    },
  },
};
