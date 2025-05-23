const axios = require('axios');
const { logger } = require('../utils/logger');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    
    this.mockWeatherData = {
      temperature: 25,
      windSpeed: 10,
      windDirection: 'NE',
      precipitation: 0
    };
    
    this.mockMarineData = {
      waveHeight: 1.5,
      waveDirection: 'N',
      currentSpeed: 2,
      currentDirection: 'SE'
    };

    this.mockData = {
      current: {
        temperature: 25,
        windSpeed: 10,
        windDirection: 180,
        description: 'Partly cloudy'
      },
      forecast: []
    };
  }

  async getWeatherForecast(coordinates) {
    try {
      if (process.env.NODE_ENV === 'development' && !this.apiKey) {
        // Return mock data for development
        return this.getMockWeatherData();
      }

      const { lat, lon } = this.formatCoordinates(coordinates);
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return this.processWeatherData(response.data);
    } catch (error) {
      logger.error('Failed to fetch weather forecast:', error);
      if (process.env.NODE_ENV === 'development') {
        // Return mock data if API call fails in development
        return this.getMockWeatherData();
      }
      throw new Error('Weather forecast service unavailable');
    }
  }

  async getMarineWeather(coordinates) {
    try {
      if (process.env.NODE_ENV === 'development' && !this.apiKey) {
        // Return mock data for development
        return this.getMockMarineData();
      }

      const { lat, lon } = this.formatCoordinates(coordinates);
      const response = await axios.get(`${this.baseUrl}/marine`, {
        params: {
          lat,
          lon,
          appid: this.apiKey
        }
      });

      return this.processMarineData(response.data);
    } catch (error) {
      logger.error('Failed to fetch marine weather:', error);
      if (process.env.NODE_ENV === 'development') {
        // Return mock data if API call fails in development
        return this.getMockMarineData();
      }
      throw new Error('Marine weather service unavailable');
    }
  }

  getMockWeatherData() {
    return {
      current: {
        temperature: 25,
        windSpeed: 10,
        windDirection: 180,
        description: 'Partly cloudy'
      },
      forecast: Array(5).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        temperature: 25 + Math.random() * 5,
        windSpeed: 10 + Math.random() * 5,
        windDirection: 180 + Math.random() * 180,
        description: 'Partly cloudy'
      }))
    };
  }

  getMockMarineData() {
    return {
      waveHeight: 1.5,
      waveDirection: 180,
      swellHeight: 1.0,
      swellDirection: 180,
      waterTemperature: 22
    };
  }

  formatCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new Error('Invalid coordinates format. Expected [longitude, latitude]');
    }

    const [longitude, latitude] = coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new Error('Invalid coordinates range');
    }

    return {
      lat: latitude,
      lon: longitude
    };
  }

  processWeatherData(data) {
    if (!data || !data.list || !data.list.length) {
      throw new Error('Invalid weather data format');
    }

    return {
      current: {
        temperature: data.list[0].main.temp,
        windSpeed: data.list[0].wind.speed,
        windDirection: data.list[0].wind.deg,
        description: data.list[0].weather[0].description
      },
      forecast: data.list.map(item => ({
        timestamp: new Date(item.dt * 1000),
        temperature: item.main.temp,
        windSpeed: item.wind.speed,
        windDirection: item.wind.deg,
        description: item.weather[0].description
      }))
    };
  }

  processMarineData(data) {
    if (!data) {
      throw new Error('Invalid marine data format');
    }

    return {
      waveHeight: data.waveHeight || 0,
      waveDirection: data.waveDirection || 0,
      swellHeight: data.swellHeight || 0,
      swellDirection: data.swellDirection || 0,
      waterTemperature: data.waterTemperature || 20
    };
  }

  async getRouteWeather(route) {
    try {
      if (!route.departure?.coordinates || !route.destination?.coordinates) {
        throw new Error('Invalid route coordinates');
      }

      // Get weather for departure and destination
      const [departureWeather, destinationWeather] = await Promise.all([
        this.getWeatherForecast(route.departure.coordinates),
        this.getWeatherForecast(route.destination.coordinates)
      ]);

      // Get marine conditions if available
      let marineConditions = null;
      try {
        const [departureMarine, destinationMarine] = await Promise.all([
          this.getMarineWeather(route.departure.coordinates),
          this.getMarineWeather(route.destination.coordinates)
        ]);
        marineConditions = { departure: departureMarine, destination: destinationMarine };
      } catch (error) {
        logger.warn('Marine weather data not available:', error);
      }

      // Calculate average conditions for the route
      const averageConditions = this.calculateAverageConditions(
        departureWeather,
        destinationWeather,
        marineConditions
      );

      return {
        departure: departureWeather,
        destination: destinationWeather,
        marine: marineConditions,
        average: averageConditions
      };
    } catch (error) {
      logger.error('Failed to get route weather:', error);
      throw error;
    }
  }

  calculateAverageConditions(departure, destination, marine) {
    const avg = {
      temperature: (departure.current.temperature + destination.current.temperature) / 2,
      windSpeed: (departure.current.windSpeed + destination.current.windSpeed) / 2,
      windDirection: this.averageAngles(
        departure.current.windDirection,
        destination.current.windDirection
      )
    };

    if (marine) {
      avg.waveHeight = (marine.departure.waveHeight + marine.destination.waveHeight) / 2;
      avg.swellHeight = (marine.departure.swellHeight + marine.destination.swellHeight) / 2;
    }

    return avg;
  }

  averageAngles(angle1, angle2) {
    const x = Math.cos(angle1 * Math.PI / 180) + Math.cos(angle2 * Math.PI / 180);
    const y = Math.sin(angle1 * Math.PI / 180) + Math.sin(angle2 * Math.PI / 180);
    return Math.atan2(y, x) * 180 / Math.PI;
  }
}

// Export the class
module.exports = WeatherService; 