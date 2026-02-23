import {
  UnifiedWeatherData,
  AirportInfo,
  WeatherSource,
  CurrentConditions,
  ForecastPeriod,
  ConsensusAnalysis,
  DisagreementItem,
  SourceValue,
  CloudLayer,
  WeatherPhenomenon,
  FlightCategory,
  WeatherAlert,
  WeatherSourceId,
  TargetTimeSnapshot,
  PirepReport,
  AirSigmet,
} from '../types/weather';
import {
  aviationWeatherService,
  AwcMetarResponse,
  AwcTafResponse,
  AwcCloud,
  AwcPirep,
  AwcAirSigmet,
} from './aviation-weather';
import { openMeteoService, OpenMeteoResponse } from './open-meteo';
import { nwsService, NwsAlert } from './nws';
import { part135Checker } from './part135-checker';
import { fratService } from './frat-service';
import { cacheService } from './cache';

class WeatherAggregator {
  async getAggregatedWeather(icao: string, targetTime?: Date): Promise<UnifiedWeatherData> {
    const normalizedIcao = icao.toUpperCase();
    const cacheKey = targetTime
      ? `${normalizedIcao}:${targetTime.toISOString()}`
      : normalizedIcao;

    // Check cache first (only for non-target-time requests to keep cache simple)
    if (!targetTime) {
      const cached = await cacheService.getWeather<UnifiedWeatherData>(normalizedIcao);
      if (cached) {
        return cached;
      }
    }

    // Fetch from all sources in parallel
    const [awcData, openMeteoData, nwsAlerts, pirepData, airSigmetData, recentMetarData] = await Promise.allSettled([
      aviationWeatherService.getMetarAndTaf(normalizedIcao),
      this.fetchOpenMeteo(normalizedIcao),
      this.fetchNwsAlerts(normalizedIcao),
      this.fetchPireps(normalizedIcao),
      this.fetchAirSigmets(normalizedIcao),
      aviationWeatherService.getRecentMetars(normalizedIcao, 3),
    ]);

    // Extract results
    const awc =
      awcData.status === 'fulfilled' ? awcData.value : { metar: null, taf: null };
    const openMeteo =
      openMeteoData.status === 'fulfilled' ? openMeteoData.value : null;
    const alerts = nwsAlerts.status === 'fulfilled' ? nwsAlerts.value : [];
    const rawPireps = pirepData.status === 'fulfilled' ? pirepData.value : [];
    const rawAirSigmets = airSigmetData.status === 'fulfilled' ? airSigmetData.value : [];
    const recentMetars = recentMetarData.status === 'fulfilled'
      ? recentMetarData.value.map(m => m.rawOb)
      : [];

    // Build airport info from AWC data
    const airport = this.buildAirportInfo(normalizedIcao, awc.metar);

    // Build sources status
    const sources = this.buildSourcesStatus(awc.metar, openMeteo);

    // Build current conditions
    const current = this.buildCurrentConditions(awc.metar, openMeteo);

    // Build forecast periods
    const forecast = this.buildForecast(awc.taf, openMeteo);

    // Analyze consensus
    const consensus = this.analyzeConsensus(current, sources);

    // Build target time snapshot if requested
    let atTargetTime: TargetTimeSnapshot | undefined;
    if (targetTime) {
      atTargetTime = this.buildTargetTimeSnapshot(targetTime, forecast, current);
    }

    // Check Part 135 status (use target time conditions if available)
    const conditionsForPart135 = atTargetTime
      ? this.forecastToCurrentConditions(atTargetTime.conditions, current)
      : current;
    const part135Status = part135Checker.checkStatus(
      conditionsForPart135,
      forecast,
      targetTime,
    );

    // Assess flight risk (FRAT)
    const frat = fratService.assess(conditionsForPart135, consensus, targetTime);

    // Build weather alerts
    const weatherAlerts = this.buildAlerts(alerts);

    // Convert PIREPs and AIR/SIGMETs to our types
    const pireps = this.convertPireps(rawPireps);
    const airSigmets = this.convertAirSigmets(rawAirSigmets);

    const result: UnifiedWeatherData = {
      airport,
      timestamp: new Date().toISOString(),
      targetTime: targetTime?.toISOString(),
      rawTaf: awc.taf?.rawTAF,
      recentMetars: recentMetars.length > 0 ? recentMetars : undefined,
      sources,
      current,
      forecast,
      atTargetTime,
      consensus,
      part135Status,
      frat,
      alerts: weatherAlerts,
      pireps,
      airSigmets,
    };

    // Cache the result (only non-target-time requests)
    if (!targetTime) {
      await cacheService.setWeather(normalizedIcao, result);
    }

    return result;
  }

  private buildTargetTimeSnapshot(
    targetTime: Date,
    forecast: ForecastPeriod[],
    current: CurrentConditions
  ): TargetTimeSnapshot {
    const now = new Date();
    const hoursAhead = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isCurrentObservation = Math.abs(hoursAhead) < 1;

    // Find the forecast period that contains the target time
    let targetPeriod = forecast.find((p) => {
      const from = new Date(p.validFrom);
      const to = new Date(p.validTo);
      return targetTime >= from && targetTime < to;
    });

    // If no exact match, find the closest period
    if (!targetPeriod && forecast.length > 0) {
      targetPeriod = forecast.reduce((closest, period) => {
        const periodMid = new Date(
          (new Date(period.validFrom).getTime() + new Date(period.validTo).getTime()) / 2
        );
        const closestMid = new Date(
          (new Date(closest.validFrom).getTime() + new Date(closest.validTo).getTime()) / 2
        );
        return Math.abs(periodMid.getTime() - targetTime.getTime()) <
          Math.abs(closestMid.getTime() - targetTime.getTime())
          ? period
          : closest;
      });
    }

    // If still no period, create a placeholder from current conditions
    if (!targetPeriod) {
      targetPeriod = {
        validFrom: targetTime.toISOString(),
        validTo: new Date(targetTime.getTime() + 3600000).toISOString(),
        type: 'BASE',
        temperature: current.temperature,
        windDirection: current.windDirection,
        windSpeed: current.windSpeed,
        windGust: current.windGust,
        visibility: current.visibility,
        ceiling: current.ceiling,
        precipitationProbability: { value: 0, bySource: {}, confidence: 'low' },
        cloudLayers: current.cloudLayers,
        weatherPhenomena: current.weatherPhenomena,
        flightCategory: current.flightCategory,
      };
    }

    // Get surrounding periods (±3 hours)
    const threeHoursBefore = new Date(targetTime.getTime() - 3 * 60 * 60 * 1000);
    const threeHoursAfter = new Date(targetTime.getTime() + 3 * 60 * 60 * 1000);
    const surroundingPeriods = forecast.filter((p) => {
      const from = new Date(p.validFrom);
      return from >= threeHoursBefore && from <= threeHoursAfter;
    });

    // Determine confidence based on hours ahead
    let confidence: 'high' | 'medium' | 'low';
    if (hoursAhead < 0) {
      confidence = 'low'; // Past time, using stale forecast
    } else if (hoursAhead <= 6) {
      confidence = 'high';
    } else if (hoursAhead <= 24) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      targetTime: targetTime.toISOString(),
      conditions: targetPeriod,
      isCurrentObservation,
      forecastHoursAhead: Math.max(0, hoursAhead),
      confidence,
      surroundingPeriods,
    };
  }

  private forecastToCurrentConditions(
    period: ForecastPeriod,
    current: CurrentConditions
  ): CurrentConditions {
    // Convert a forecast period to CurrentConditions format for Part 135 checking
    return {
      observationTime: period.validFrom,
      rawMetar: current.rawMetar,
      temperature: period.temperature,
      dewpoint: current.dewpoint,
      humidity: current.humidity,
      pressure: current.pressure,
      windDirection: period.windDirection,
      windSpeed: period.windSpeed,
      windGust: period.windGust,
      visibility: period.visibility,
      ceiling: period.ceiling,
      cloudLayers: period.cloudLayers,
      weatherPhenomena: period.weatherPhenomena,
      flightCategory: period.flightCategory,
    };
  }

  private async fetchOpenMeteo(
    icao: string
  ): Promise<{ data: OpenMeteoResponse; lat: number; lon: number } | null> {
    // First get airport coordinates from AWC
    const metar = await aviationWeatherService.getMetar(icao);
    if (!metar) return null;

    const data = await openMeteoService.getForecast(metar.lat, metar.lon);
    if (!data) return null;

    return { data, lat: metar.lat, lon: metar.lon };
  }

  private async fetchNwsAlerts(icao: string): Promise<NwsAlert[]> {
    const metar = await aviationWeatherService.getMetar(icao);
    if (!metar) return [];

    return nwsService.getAlerts(metar.lat, metar.lon);
  }

  private buildAirportInfo(
    icao: string,
    metar: AwcMetarResponse | null
  ): AirportInfo {
    if (metar) {
      return {
        icao: metar.icaoId,
        name: metar.name || icao,
        city: metar.name?.split(',')[0] || '',
        country: this.deriveCountry(metar.icaoId),
        latitude: metar.lat,
        longitude: metar.lon,
        elevation: metar.elev,
      };
    }

    return {
      icao,
      name: icao,
      city: '',
      country: '',
      latitude: 0,
      longitude: 0,
      elevation: 0,
    };
  }

  private buildSourcesStatus(
    metar: AwcMetarResponse | null,
    openMeteo: { data: OpenMeteoResponse } | null
  ): WeatherSource[] {
    const sources: WeatherSource[] = [];

    sources.push({
      id: 'awc',
      name: 'Aviation Weather Center',
      lastUpdated: metar ? metar.reportTime : '',
      status: metar ? 'ok' : 'error',
      errorMessage: metar ? undefined : 'Failed to fetch METAR data',
    });

    sources.push({
      id: 'openmeteo',
      name: 'Open-Meteo',
      lastUpdated: new Date().toISOString(),
      status: openMeteo ? 'ok' : 'error',
      errorMessage: openMeteo ? undefined : 'Failed to fetch forecast data',
    });

    sources.push({
      id: 'nws',
      name: 'National Weather Service',
      lastUpdated: new Date().toISOString(),
      status: 'ok', // Alerts may or may not be present
    });

    return sources;
  }

  private buildCurrentConditions(
    metar: AwcMetarResponse | null,
    openMeteo: { data: OpenMeteoResponse } | null
  ): CurrentConditions {
    const now = new Date();
    const currentHourIndex = openMeteo
      ? openMeteo.data.hourly.time.findIndex((t) => new Date(t) >= now) - 1
      : -1;

    // Helper to create SourceValue with multiple sources
    const createSourceValue = <T>(
      awcValue: T | undefined | null,
      openMeteoValue: T | undefined | null,
      defaultValue: T
    ): SourceValue<T> => {
      const bySource: Partial<Record<WeatherSourceId, T>> = {};
      const values: T[] = [];

      if (awcValue !== undefined && awcValue !== null) {
        bySource.awc = awcValue;
        values.push(awcValue);
      }
      if (openMeteoValue !== undefined && openMeteoValue !== null) {
        bySource.openmeteo = openMeteoValue;
        values.push(openMeteoValue);
      }

      const value = values.length > 0 ? values[0] : defaultValue;

      // Calculate spread for numeric values
      let spread: number | undefined;
      if (values.length > 1 && typeof values[0] === 'number') {
        const numValues = values as number[];
        spread = Math.max(...numValues) - Math.min(...numValues);
      }

      return {
        value,
        bySource,
        confidence:
          values.length >= 2
            ? spread !== undefined && spread < 5
              ? 'high'
              : 'medium'
            : 'low',
        spread,
      };
    };

    // Get Open-Meteo current values
    const omTemp =
      currentHourIndex >= 0
        ? openMeteo?.data.hourly.temperature_2m[currentHourIndex]
        : null;
    const omHumidity =
      currentHourIndex >= 0
        ? openMeteo?.data.hourly.relative_humidity_2m[currentHourIndex]
        : null;
    const omWindSpeed =
      currentHourIndex >= 0
        ? openMeteo?.data.hourly.wind_speed_10m[currentHourIndex]
        : null;
    const omWindDir =
      currentHourIndex >= 0
        ? openMeteo?.data.hourly.wind_direction_10m[currentHourIndex]
        : null;
    const omWindGust =
      currentHourIndex >= 0
        ? openMeteo?.data.hourly.wind_gusts_10m[currentHourIndex]
        : null;
    const omVisibility =
      currentHourIndex >= 0
        ? openMeteo?.data.hourly.visibility[currentHourIndex]
        : null;

    // Parse cloud layers
    const cloudLayers = this.parseCloudLayers(metar?.clouds);

    // Calculate ceiling
    const ceiling = this.calculateCeiling(cloudLayers);

    // Parse weather phenomena
    const weatherPhenomena = this.parseWeatherPhenomena(metar?.wxString);

    // Calculate humidity from temp and dewpoint
    const humidity = metar?.temp && metar?.dewp
      ? this.calculateHumidity(metar.temp, metar.dewp)
      : null;

    // Parse visibility
    const awcVisibility = this.parseVisibility(metar?.visib);

    const temperature = createSourceValue(metar?.temp, omTemp, 0);
    const windSpeed = createSourceValue(
      metar?.wspd,
      omWindSpeed ? openMeteoService.windSpeedToKnots(omWindSpeed) : null,
      0
    );
    const omVisMiles = omVisibility ? openMeteoService.visibilityToStatuteMiles(omVisibility) : null;
    // Use first available source; default to 10 SM only if both sources are present but null
    const visDefault = (awcVisibility !== null || omVisMiles !== null) ? 10 : 10;
    const visibility = createSourceValue(
      awcVisibility,
      omVisMiles,
      visDefault
    );

    const flightCategory = part135Checker.categorize(ceiling, visibility.value);

    // Handle wind direction: numeric degrees, 'VRB' for variable, or null for calm
    const awcWindDir = metar?.wdir;
    const isVariableWind = typeof awcWindDir === 'string' && awcWindDir.toUpperCase() === 'VRB';
    const awcWindDirValue = typeof awcWindDir === 'number' ? awcWindDir : null;

    return {
      observationTime: metar?.reportTime || new Date().toISOString(),
      rawMetar: metar?.rawOb,
      isVariableWind,
      temperature,
      dewpoint: createSourceValue(metar?.dewp, null, 0),
      humidity: createSourceValue(humidity, omHumidity, 0),
      pressure: createSourceValue(metar?.altim, null, 29.92),
      windDirection: createSourceValue(
        awcWindDirValue,
        omWindDir,
        null
      ),
      windSpeed,
      windGust: createSourceValue(
        metar?.wgst,
        omWindGust ? openMeteoService.windSpeedToKnots(omWindGust) : null,
        null
      ),
      visibility,
      ceiling: createSourceValue<number | null>(ceiling, null, null),
      cloudLayers,
      weatherPhenomena,
      flightCategory: {
        value: flightCategory,
        bySource: { awc: flightCategory },
        confidence: 'high',
      },
    };
  }

  private parseCloudLayers(clouds: AwcCloud[] | null | undefined): CloudLayer[] {
    if (!clouds || clouds.length === 0) {
      return [{ coverage: 'CLR', base: 0 }];
    }

    return clouds.map((c) => ({
      coverage: c.cover as CloudLayer['coverage'],
      base: c.base || 0,
      type: c.type as 'CB' | 'TCU' | undefined,
    }));
  }

  private calculateCeiling(layers: CloudLayer[]): number | null {
    // Ceiling is the lowest BKN or OVC layer
    const ceilingLayers = layers.filter(
      (l) => l.coverage === 'BKN' || l.coverage === 'OVC' || l.coverage === 'VV'
    );

    if (ceilingLayers.length === 0) {
      return null; // Unlimited ceiling
    }

    return Math.min(...ceilingLayers.map((l) => l.base));
  }

  private parseVisibility(visib: string | number | null | undefined): number | null {
    if (visib === null || visib === undefined) {
      return null; // Not reported
    }

    if (typeof visib === 'number') {
      return visib;
    }

    // Parse string visibility like "10+" or "1/2"
    if (visib.includes('+')) {
      const parsed = parseFloat(visib.replace('+', ''));
      return isNaN(parsed) ? null : parsed;
    }

    if (visib.includes('/')) {
      const [num, den] = visib.split('/');
      const result = parseFloat(num) / parseFloat(den);
      return isNaN(result) ? null : result;
    }

    const parsed = parseFloat(visib);
    return isNaN(parsed) ? null : parsed;
  }

  private parseWeatherPhenomena(wxString: string | null | undefined): WeatherPhenomenon[] {
    if (!wxString) return [];

    const phenomena: WeatherPhenomenon[] = [];
    const wxCodes = wxString.split(' ');

    const descriptions: Record<string, string> = {
      RA: 'Rain',
      SN: 'Snow',
      FG: 'Fog',
      BR: 'Mist',
      HZ: 'Haze',
      TS: 'Thunderstorm',
      SH: 'Showers',
      DZ: 'Drizzle',
      GR: 'Hail',
      PL: 'Ice Pellets',
      FZ: 'Freezing',
      '+': 'Heavy',
      '-': 'Light',
    };

    for (const code of wxCodes) {
      let intensity: '-' | '' | '+' = '';
      let remaining = code;

      if (code.startsWith('+')) {
        intensity = '+';
        remaining = code.slice(1);
      } else if (code.startsWith('-')) {
        intensity = '-';
        remaining = code.slice(1);
      }

      // Extract descriptor (2 chars) and type
      let descriptor: string | undefined;
      if (['MI', 'BC', 'PR', 'DR', 'BL', 'SH', 'TS', 'FZ'].includes(remaining.slice(0, 2))) {
        descriptor = remaining.slice(0, 2);
        remaining = remaining.slice(2);
      }

      if (remaining) {
        const intensityDesc = intensity === '+' ? 'Heavy ' : intensity === '-' ? 'Light ' : '';
        const descStr = descriptor ? descriptions[descriptor] + ' ' : '';
        const typeDesc = descriptions[remaining] || remaining;

        phenomena.push({
          intensity,
          descriptor,
          type: remaining,
          description: `${intensityDesc}${descStr}${typeDesc}`.trim(),
        });
      }
    }

    return phenomena;
  }

  private calculateHumidity(temp: number, dewpoint: number): number {
    // Magnus formula for relative humidity
    const a = 17.27;
    const b = 237.7;

    const alpha = (a * dewpoint) / (b + dewpoint);
    const beta = (a * temp) / (b + temp);

    const humidity = 100 * Math.exp(alpha - beta);
    return Math.round(humidity);
  }

  private buildForecast(
    taf: AwcTafResponse | null,
    openMeteo: { data: OpenMeteoResponse } | null
  ): ForecastPeriod[] {
    const periods: ForecastPeriod[] = [];

    if (taf && taf.fcsts) {
      for (const fcst of taf.fcsts) {
        const fromDate = new Date(fcst.timeFrom * 1000);
        const toDate = new Date(fcst.timeTo * 1000);

        const cloudLayers = this.parseCloudLayers(fcst.clouds);
        const ceiling = this.calculateCeiling(cloudLayers);
        const parsedVis = this.parseVisibility(fcst.visib);
        const visibility = parsedVis !== null ? parsedVis : 10; // TAF visibility defaults to P6SM (10) if not specified
        const weatherPhenomena = this.parseWeatherPhenomena(fcst.wxString);
        const flightCategory = part135Checker.categorize(ceiling, visibility);

        periods.push({
          validFrom: fromDate.toISOString(),
          validTo: toDate.toISOString(),
          type: (fcst.fcstChange as ForecastPeriod['type']) || 'BASE',
          probability: fcst.probability || undefined,
          temperature: { value: null as unknown as number, bySource: {}, confidence: 'low' },
          windDirection: {
            value: typeof fcst.wdir === 'number' ? fcst.wdir : null,
            bySource: {
              awc: typeof fcst.wdir === 'number' ? fcst.wdir : null,
            },
            confidence: 'high',
          },
          isVariableWind: typeof fcst.wdir === 'string' && fcst.wdir.toUpperCase() === 'VRB',
          windSpeed: {
            value: fcst.wspd || 0,
            bySource: { awc: fcst.wspd || 0 },
            confidence: 'high',
          },
          windGust: {
            value: fcst.wgst || null,
            bySource: { awc: fcst.wgst || null },
            confidence: 'high',
          },
          visibility: {
            value: visibility,
            bySource: { awc: visibility },
            confidence: 'high',
          },
          ceiling: {
            value: ceiling,
            bySource: { awc: ceiling },
            confidence: 'high',
          },
          precipitationProbability: { value: 0, bySource: {}, confidence: 'low' },
          cloudLayers,
          weatherPhenomena,
          flightCategory: {
            value: flightCategory,
            bySource: { awc: flightCategory },
            confidence: 'high',
          },
        });
      }
    }

    // Add Open-Meteo hourly forecasts if available
    if (openMeteo?.data.hourly) {
      const hourly = openMeteo.data.hourly;
      for (let i = 0; i < Math.min(hourly.time.length, 48); i++) {
        const time = new Date(hourly.time[i]);
        const nextTime = new Date(time.getTime() + 3600000); // +1 hour

        // Skip if we already have a TAF period for this time
        if (
          periods.some(
            (p) =>
              new Date(p.validFrom) <= time && time < new Date(p.validTo)
          )
        ) {
          continue;
        }

        const visibility = hourly.visibility[i] != null
          ? openMeteoService.visibilityToStatuteMiles(hourly.visibility[i]!)
          : 10;
        const flightCategory = part135Checker.categorize(null, visibility);

        periods.push({
          validFrom: time.toISOString(),
          validTo: nextTime.toISOString(),
          type: 'BASE',
          temperature: {
            value: hourly.temperature_2m[i] || 0,
            bySource: { openmeteo: hourly.temperature_2m[i] || 0 },
            confidence: 'medium',
          },
          windDirection: {
            value: hourly.wind_direction_10m[i] || null,
            bySource: { openmeteo: hourly.wind_direction_10m[i] || null },
            confidence: 'medium',
          },
          windSpeed: {
            value: hourly.wind_speed_10m[i]
              ? openMeteoService.windSpeedToKnots(hourly.wind_speed_10m[i]!)
              : 0,
            bySource: {
              openmeteo: hourly.wind_speed_10m[i]
                ? openMeteoService.windSpeedToKnots(hourly.wind_speed_10m[i]!)
                : 0,
            },
            confidence: 'medium',
          },
          windGust: {
            value: hourly.wind_gusts_10m[i]
              ? openMeteoService.windSpeedToKnots(hourly.wind_gusts_10m[i]!)
              : null,
            bySource: {
              openmeteo: hourly.wind_gusts_10m[i]
                ? openMeteoService.windSpeedToKnots(hourly.wind_gusts_10m[i]!)
                : null,
            },
            confidence: 'medium',
          },
          visibility: {
            value: visibility,
            bySource: { openmeteo: visibility },
            confidence: 'medium',
          },
          ceiling: {
            value: null,
            bySource: {},
            confidence: 'low',
          },
          precipitationProbability: {
            value: hourly.precipitation_probability[i] || 0,
            bySource: { openmeteo: hourly.precipitation_probability[i] || 0 },
            confidence: 'medium',
          },
          cloudLayers: [],
          weatherPhenomena: [],
          flightCategory: {
            value: flightCategory,
            bySource: { openmeteo: flightCategory },
            confidence: 'medium',
          },
        });
      }
    }

    // Sort by validFrom
    periods.sort(
      (a, b) =>
        new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime()
    );

    return periods;
  }

  private analyzeConsensus(
    current: CurrentConditions,
    sources: WeatherSource[]
  ): ConsensusAnalysis {
    const disagreements: DisagreementItem[] = [];
    let totalConfidence = 0;
    let paramCount = 0;

    // Check temperature agreement
    if (Object.keys(current.temperature.bySource).length > 1) {
      paramCount++;
      if (current.temperature.spread && current.temperature.spread > 3) {
        disagreements.push({
          parameter: 'Temperature',
          description: `Sources differ by ${current.temperature.spread.toFixed(1)}°C`,
          severity: current.temperature.spread > 5 ? 'significant' : 'minor',
          sourceValues: Object.fromEntries(
            Object.entries(current.temperature.bySource).map(([k, v]) => [
              k,
              `${v}°C`,
            ])
          ),
        });
      } else {
        totalConfidence += 1;
      }
    }

    // Check wind speed agreement
    if (Object.keys(current.windSpeed.bySource).length > 1) {
      paramCount++;
      if (current.windSpeed.spread && current.windSpeed.spread > 5) {
        disagreements.push({
          parameter: 'Wind Speed',
          description: `Sources differ by ${current.windSpeed.spread.toFixed(0)} knots`,
          severity: current.windSpeed.spread > 10 ? 'significant' : 'moderate',
          sourceValues: Object.fromEntries(
            Object.entries(current.windSpeed.bySource).map(([k, v]) => [
              k,
              `${v} kts`,
            ])
          ),
        });
      } else {
        totalConfidence += 1;
      }
    }

    // Check visibility agreement
    if (Object.keys(current.visibility.bySource).length > 1) {
      paramCount++;
      if (current.visibility.spread && current.visibility.spread > 2) {
        disagreements.push({
          parameter: 'Visibility',
          description: `Sources differ by ${current.visibility.spread.toFixed(1)} SM`,
          severity: current.visibility.spread > 5 ? 'significant' : 'moderate',
          sourceValues: Object.fromEntries(
            Object.entries(current.visibility.bySource).map(([k, v]) => [
              k,
              `${v} SM`,
            ])
          ),
        });
      } else {
        totalConfidence += 1;
      }
    }

    // Calculate overall agreement
    const activeSources = sources.filter((s) => s.status === 'ok').length;
    const confidenceScore =
      paramCount > 0
        ? Math.round((totalConfidence / paramCount) * 100)
        : activeSources > 1
        ? 75
        : 50;

    let overallAgreement: 'strong' | 'moderate' | 'weak';
    if (
      disagreements.filter((d) => d.severity === 'significant').length > 0
    ) {
      overallAgreement = 'weak';
    } else if (disagreements.length > 2) {
      overallAgreement = 'moderate';
    } else {
      overallAgreement = 'strong';
    }

    return {
      overallAgreement,
      disagreementAreas: disagreements,
      confidenceScore,
    };
  }

  private buildAlerts(nwsAlerts: NwsAlert[]): WeatherAlert[] {
    return nwsAlerts.map((alert) => ({
      type: this.mapAlertType(alert.properties.event),
      severity: nwsService.mapSeverity(alert.properties.severity),
      title: alert.properties.headline || alert.properties.event,
      description: alert.properties.description,
      validFrom: alert.properties.effective,
      validTo: alert.properties.expires,
      area: alert.properties.areaDesc,
    }));
  }

  private async fetchPireps(icao: string): Promise<AwcPirep[]> {
    const metar = await aviationWeatherService.getMetar(icao);
    if (!metar) return [];
    return aviationWeatherService.getPireps(metar.lat, metar.lon);
  }

  private async fetchAirSigmets(icao: string): Promise<AwcAirSigmet[]> {
    const metar = await aviationWeatherService.getMetar(icao);
    if (!metar) return [];
    return aviationWeatherService.getAirSigmets(metar.lat, metar.lon);
  }

  convertPireps(rawPireps: AwcPirep[]): PirepReport[] {
    return rawPireps.map((pirep) => {
      const report: PirepReport = {
        id: pirep.pirepId,
        reportTime: pirep.reportTime,
        location: { lat: pirep.lat, lon: pirep.lon },
        altitude: pirep.fltlvl * 100, // Convert flight level to feet
        aircraftType: pirep.acType || 'Unknown',
        rawReport: pirep.rawOb,
        weatherString: pirep.wxString || undefined,
      };

      // Extract turbulence info
      if (pirep.turb && pirep.turb.length > 0) {
        const worstTurb = pirep.turb.reduce((worst, t) => {
          const intensityOrder = ['NEG', 'SMTH', 'LGT', 'LGT-MOD', 'MOD', 'MOD-SEV', 'SEV', 'EXTRM'];
          const worstIdx = intensityOrder.indexOf(worst.intensity);
          const tIdx = intensityOrder.indexOf(t.intensity);
          return tIdx > worstIdx ? t : worst;
        });
        report.turbulence = {
          intensity: worstTurb.intensity,
          minAlt: worstTurb.minAltFt,
          maxAlt: worstTurb.maxAltFt,
        };
      }

      // Extract icing info
      if (pirep.ice && pirep.ice.length > 0) {
        const worstIce = pirep.ice.reduce((worst, i) => {
          const intensityOrder = ['NEG', 'NEGClr', 'TRC', 'LGT', 'LGT-MOD', 'MOD', 'MOD-SEV', 'SEV', 'EXTRM'];
          const worstIdx = intensityOrder.indexOf(worst.intensity);
          const iIdx = intensityOrder.indexOf(i.intensity);
          return iIdx > worstIdx ? i : worst;
        });
        report.icing = {
          intensity: worstIce.intensity,
          minAlt: worstIce.minAltFt,
          maxAlt: worstIce.maxAltFt,
        };
      }

      return report;
    });
  }

  convertAirSigmets(rawAirSigmets: AwcAirSigmet[]): AirSigmet[] {
    return rawAirSigmets.map((item) => {
      let type: AirSigmet['type'];
      const typeUpper = item.airSigmetType?.toUpperCase() || '';
      if (typeUpper.includes('CONVECTIVE') || typeUpper === 'CONV') {
        type = 'CONVECTIVE_SIGMET';
      } else if (typeUpper.includes('SIGMET') || typeUpper === 'SIGMET') {
        type = 'SIGMET';
      } else {
        type = 'AIRMET';
      }

      return {
        id: item.airSigmetId,
        type,
        hazard: item.hazard || 'Unknown',
        severity: item.severity || 'Unknown',
        validFrom: new Date(item.validTimeFrom * 1000).toISOString(),
        validTo: new Date(item.validTimeTo * 1000).toISOString(),
        altitudeLow: item.altLow,
        altitudeHigh: item.altHi,
        rawText: item.rawAirSigmet,
        coordinates: item.coords || [],
      };
    });
  }

  private deriveCountry(icao: string): string {
    const prefix = icao.charAt(0).toUpperCase();
    const prefix2 = icao.substring(0, 2).toUpperCase();
    const countryMap: Record<string, string> = {
      'K': 'US', 'PH': 'US', 'PA': 'US', 'PF': 'US', // US (CONUS, Hawaii, Alaska)
      'C': 'CA',  // Canada
      'M': 'MX',  // Mexico/Central America
      'T': 'Caribbean',
      'EG': 'GB', 'EI': 'IE', 'EH': 'NL', 'ED': 'DE', 'EB': 'BE',
      'EF': 'FI', 'EN': 'NO', 'ES': 'SE', 'EK': 'DK',
      'LF': 'FR', 'LI': 'IT', 'LE': 'ES', 'LP': 'PT', 'LG': 'GR',
      'LO': 'AT', 'LS': 'CH', 'LK': 'CZ', 'LH': 'HU', 'LW': 'MK',
      'R': 'Asia-Pacific',
      'Z': 'CN',  // China
      'V': 'South Asia',
      'W': 'Southeast Asia',
      'Y': 'AU',  // Australia
      'NZ': 'NZ', // New Zealand
      'S': 'South America',
      'F': 'Africa',
      'H': 'East Africa',
      'D': 'West Africa',
      'O': 'Middle East',
      'U': 'Russia/CIS',
    };
    return countryMap[prefix2] || countryMap[prefix] || '';
  }

  private mapAlertType(event: string): WeatherAlert['type'] {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('sigmet')) return 'SIGMET';
    if (eventLower.includes('airmet')) return 'AIRMET';
    if (eventLower.includes('convective') || eventLower.includes('thunderstorm'))
      return 'CONVECTIVE';
    if (eventLower.includes('tfr')) return 'TFR';
    return 'WARNING';
  }
}

export const weatherAggregator = new WeatherAggregator();
