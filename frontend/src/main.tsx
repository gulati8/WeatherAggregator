import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import AirportWeather from './pages/AirportWeather';
import TripPlanner from './pages/TripPlanner';
import MapView from './pages/MapView';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="weather/:icao" element={<AirportWeather />} />
          <Route path="trip" element={<TripPlanner />} />
          <Route path="trip/:tripId" element={<TripPlanner />} />
          <Route path="map" element={<MapView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
