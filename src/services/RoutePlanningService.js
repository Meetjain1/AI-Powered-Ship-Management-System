const mongoose = require('mongoose');
const Route = require('../models/Route');
const Ship = require('../models/Ship');
const { logger } = require('../utils/logger');
const WeatherService = require('./WeatherService');
const RouteOptimizer = require('./ai/RouteOptimizer');

class RoutePlanningService {
  constructor() {
    this.weatherService = new WeatherService();
    this.routeOptimizer = new RouteOptimizer();
  }

  async planRoute(routeData) {
    try {
      // Validate input data
      if (!routeData.shipId || !routeData.departure?.coordinates || !routeData.destination?.coordinates) {
        throw new Error('Invalid route data: missing required fields');
      }

      const ship = await Ship.findById(routeData.shipId);
      if (!ship) {
        throw new Error('Ship not found');
      }

      let weatherData = null;
      let marineData = null;

      try {
        // Get weather data for route
        weatherData = await this.weatherService.getWeatherForecast(routeData.departure.coordinates);
        marineData = await this.weatherService.getMarineWeather(routeData.departure.coordinates);
      } catch (weatherError) {
        logger.warn('Weather service error:', weatherError);
        // Continue with route planning even if weather service is unavailable
        weatherData = {
          current: {
            temperature: 20,
            windSpeed: 5,
            windDirection: 0,
            description: 'No weather data available'
          },
          forecast: []
        };
        marineData = {
          waveHeight: 0,
          waveDirection: 0,
          swellHeight: 0,
          swellDirection: 0,
          waterTemperature: 20
        };
      }

      // Optimize route
      const optimizedRoute = await this.routeOptimizer.optimizeRoute({
        ship,
        departure: routeData.departure,
        destination: routeData.destination,
        weather: weatherData,
        marine: marineData,
        cargoWeight: routeData.cargoWeight || 0
      });

      // Create route record
      const route = new Route({
        ship: ship._id,
        departure: routeData.departure,
        destination: routeData.destination,
        estimatedDeparture: routeData.estimatedDeparture || new Date(),
        estimatedArrival: optimizedRoute.estimatedArrival,
        distance: optimizedRoute.distance,
        waypoints: optimizedRoute.waypoints,
        weather: {
          departure: weatherData,
          marine: marineData,
          average: this.calculateAverageWeather(weatherData, marineData)
        },
        fuelConsumption: {
          estimated: optimizedRoute.fuelConsumption
        },
        cargoWeight: routeData.cargoWeight || 0,
        status: 'PLANNED'
      });

      await route.save();
      
      // Update ship's routes
      ship.routes.push(route._id);
      await ship.save();

      return route;
    } catch (error) {
      logger.error('Route planning error:', error);
      throw error;
    }
  }

  calculateAverageWeather(weatherData, marineData) {
    return {
      temperature: weatherData?.current?.temperature || 20,
      windSpeed: weatherData?.current?.windSpeed || 0,
      windDirection: weatherData?.current?.windDirection || 0,
      waveHeight: marineData?.waveHeight || 0,
      swellHeight: marineData?.swellHeight || 0
    };
  }

  generateWaypoints(departure, destination, weatherData) {
    // Calculate intermediate points based on weather conditions
    const numPoints = 5; // Number of waypoints between departure and destination
    const waypoints = [];

    for (let i = 1; i < numPoints - 1; i++) {
      const ratio = i / numPoints;
      const lat = departure[1] + (destination[1] - departure[1]) * ratio;
      const lon = departure[0] + (destination[0] - departure[0]) * ratio;

      waypoints.push({
        coordinates: [lon, lat],
        // Estimate arrival time at waypoint (linear interpolation)
        estimatedArrival: new Date(
          Date.now() + (ratio * (destination.estimatedArrival - departure.estimatedDeparture))
        )
      });
    }

    return waypoints;
  }

  async updateRouteStatus(routeId, status, actualData = {}) {
    try {
      const route = await Route.findById(routeId);
      if (!route) {
        throw new Error('Route not found');
      }

      route.status = status;

      if (status === 'IN_PROGRESS') {
        route.actualDeparture = new Date();
      } else if (status === 'COMPLETED') {
        route.actualArrival = new Date();
        route.fuelConsumption.actual = actualData.fuelConsumption;

        // Update AI model with actual data
        await this.updateAIModel(route);
      }

      await route.save();
      return route;
    } catch (error) {
      logger.error('Failed to update route status:', error);
      throw error;
    }
  }

  async updateAIModel(route) {
    try {
      // Prepare training data
      const trainingData = [{
        distance: route.distance,
        cargoWeight: route.cargoWeight,
        weather: route.weather.average,
        shipType: (await Ship.findById(route.ship)).type,
        fuelType: (await Ship.findById(route.ship)).fuelType,
        date: route.actualDeparture,
        actualDuration: 
          (route.actualArrival - route.actualDeparture) / (1000 * 60 * 60), // hours
        actualFuelConsumption: route.fuelConsumption.actual
      }];

      // Train model with new data
      await RouteOptimizer.train(trainingData);
      logger.info('AI model updated with new route data');
    } catch (error) {
      logger.error('Failed to update AI model:', error);
      // Don't throw error as this is a non-critical operation
    }
  }

  async getRouteAnalytics(shipId, timeframe = 'monthly') {
    try {
      const routes = await Route.find({
        ship: shipId,
        status: 'COMPLETED'
      }).sort('-actualArrival');

      const analytics = {
        totalRoutes: routes.length,
        averageFuelEfficiency: this.calculateAverageFuelEfficiency(routes),
        routeOptimization: this.calculateRouteOptimization(routes),
        weatherImpact: this.analyzeWeatherImpact(routes),
        trends: this.analyzeTrends(routes, timeframe)
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get route analytics:', error);
      throw error;
    }
  }

  calculateAverageFuelEfficiency(routes) {
    if (routes.length === 0) return 0;

    const efficiencies = routes.map(route => {
      const actual = route.fuelConsumption.actual;
      const estimated = route.fuelConsumption.estimated;
      return (estimated - actual) / estimated * 100;
    });

    return efficiencies.reduce((sum, eff) => sum + eff, 0) / routes.length;
  }

  calculateRouteOptimization(routes) {
    if (routes.length === 0) return 0;

    const optimizations = routes.map(route => {
      const actualDuration = 
        (route.actualArrival - route.actualDeparture) / (1000 * 60 * 60);
      const estimatedDuration = 
        (route.estimatedArrival - route.estimatedDeparture) / (1000 * 60 * 60);
      return (estimatedDuration - actualDuration) / estimatedDuration * 100;
    });

    return optimizations.reduce((sum, opt) => sum + opt, 0) / routes.length;
  }

  analyzeWeatherImpact(routes) {
    // Analyze correlation between weather conditions and route performance
    const impacts = routes.map(route => ({
      windSpeed: route.weather.average.windSpeed,
      waveHeight: route.weather.average.waveHeight,
      performanceScore: this.calculatePerformanceScore(route)
    }));

    return {
      windSpeedCorrelation: this.calculateCorrelation(
        impacts.map(i => i.windSpeed),
        impacts.map(i => i.performanceScore)
      ),
      waveHeightCorrelation: this.calculateCorrelation(
        impacts.map(i => i.waveHeight),
        impacts.map(i => i.performanceScore)
      )
    };
  }

  calculatePerformanceScore(route) {
    const fuelEfficiency = 
      (route.fuelConsumption.estimated - route.fuelConsumption.actual) / 
      route.fuelConsumption.estimated;
    
    const timeEfficiency = 
      (route.estimatedArrival - route.estimatedDeparture) /
      (route.actualArrival - route.actualDeparture);

    return (fuelEfficiency + timeEfficiency) / 2 * 100;
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const sum_x = x.reduce((a, b) => a + b, 0);
    const sum_y = y.reduce((a, b) => a + b, 0);
    const sum_xy = x.reduce((a, b, i) => a + b * y[i], 0);
    const sum_xx = x.reduce((a, b) => a + b * b, 0);
    const sum_yy = y.reduce((a, b) => a + b * b, 0);

    return (n * sum_xy - sum_x * sum_y) /
           Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y));
  }

  analyzeTrends(routes, timeframe) {
    const periods = this.groupRoutesByTimeframe(routes, timeframe);
    
    return {
      fuelConsumption: this.calculateTrend(periods, 'fuelConsumption'),
      duration: this.calculateTrend(periods, 'duration'),
      efficiency: this.calculateTrend(periods, 'efficiency')
    };
  }

  groupRoutesByTimeframe(routes, timeframe) {
    const periods = {};
    
    routes.forEach(route => {
      const date = new Date(route.actualDeparture);
      let key;

      switch (timeframe) {
        case 'weekly':
          key = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        case 'yearly':
          key = `${date.getFullYear()}`;
          break;
        default:
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }

      if (!periods[key]) {
        periods[key] = [];
      }
      periods[key].push(route);
    });

    return periods;
  }

  calculateTrend(periods, metric) {
    return Object.entries(periods).map(([period, routes]) => {
      let value;

      switch (metric) {
        case 'fuelConsumption':
          value = routes.reduce((sum, r) => sum + r.fuelConsumption.actual, 0) / routes.length;
          break;
        case 'duration':
          value = routes.reduce((sum, r) => 
            sum + (r.actualArrival - r.actualDeparture) / (1000 * 60 * 60), 0
          ) / routes.length;
          break;
        case 'efficiency':
          value = this.calculateAverageFuelEfficiency(routes);
          break;
      }

      return {
        period,
        value
      };
    });
  }

  async getFuelConsumptionAnalytics(shipId, timeframe = 'monthly') {
    try {
      const routes = await Route.find({
        ship: shipId,
        status: 'COMPLETED',
        'fuelConsumption.actual': { $exists: true }
      }).sort('-actualArrival');

      if (!routes.length) {
        return {
          averageFuelEfficiency: 0,
          totalConsumption: 0,
          trends: [],
          predictions: {
            nextMonth: 0,
            confidence: 0
          }
        };
      }

      // Calculate average fuel efficiency
      const efficiencies = routes.map(route => {
        const actual = route.fuelConsumption.actual;
        const estimated = route.fuelConsumption.estimated;
        return (estimated - actual) / estimated * 100;
      });

      const averageFuelEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / routes.length;

      // Calculate total consumption
      const totalConsumption = routes.reduce((sum, route) => sum + route.fuelConsumption.actual, 0);

      // Calculate trends
      const periods = this.groupRoutesByTimeframe(routes, timeframe);
      const trends = Object.entries(periods).map(([period, periodRoutes]) => ({
        period,
        consumption: periodRoutes.reduce((sum, r) => sum + r.fuelConsumption.actual, 0),
        efficiency: periodRoutes.reduce((sum, r) => {
          const eff = (r.fuelConsumption.estimated - r.fuelConsumption.actual) / r.fuelConsumption.estimated * 100;
          return sum + eff;
        }, 0) / periodRoutes.length
      }));

      // Predict next month's consumption using simple moving average
      const recentMonths = trends.slice(-3);
      const predictedConsumption = recentMonths.length > 0
        ? recentMonths.reduce((sum, t) => sum + t.consumption, 0) / recentMonths.length
        : 0;

      return {
        averageFuelEfficiency,
        totalConsumption,
        trends,
        predictions: {
          nextMonth: predictedConsumption,
          confidence: 0.85 // Placeholder confidence score
        }
      };
    } catch (error) {
      logger.error('Failed to get fuel consumption analytics:', error);
      throw error;
    }
  }

  async analyzeWeatherImpactByShip(shipId, timeframe = 'monthly') {
    try {
      const routes = await Route.find({
        ship: shipId,
        status: 'COMPLETED',
        'weather.average': { $exists: true }
      }).sort('-actualArrival');

      if (!routes.length) {
        return {
          weatherImpact: {
            windSpeedEffect: 0,
            waveHeightEffect: 0,
            temperatureEffect: 0
          },
          routeDeviations: [],
          fuelEfficiencyImpact: {
            averageIncrease: 0,
            peakIncrease: 0,
            recommendations: []
          }
        };
      }

      // Analyze weather impact on routes
      const weatherEffects = this.analyzeWeatherImpact(routes);

      // Calculate route deviations due to weather
      const routeDeviations = routes.map(route => ({
        date: route.actualDeparture,
        deviation: this.calculateRouteDeviation(route),
        weatherCondition: this.summarizeWeatherCondition(route.weather.average)
      }));

      // Analyze fuel efficiency impact
      const fuelEfficiencyImpact = this.analyzeFuelEfficiencyImpact(routes);

      return {
        weatherImpact: {
          windSpeedEffect: weatherEffects.windSpeedCorrelation * 100,
          waveHeightEffect: weatherEffects.waveHeightCorrelation * 100,
          temperatureEffect: this.calculateTemperatureEffect(routes)
        },
        routeDeviations,
        fuelEfficiencyImpact
      };
    } catch (error) {
      logger.error('Failed to analyze weather impact:', error);
      throw error;
    }
  }

  calculateRouteDeviation(route) {
    // Calculate actual vs planned route deviation in nautical miles
    const plannedDistance = route.distance;
    const actualDistance = this.calculateActualDistance(route);
    return Math.abs(actualDistance - plannedDistance);
  }

  calculateActualDistance(route) {
    // Mock calculation - in real implementation, would use actual route tracking data
    return route.distance * (1 + Math.random() * 0.2); // Up to 20% deviation
  }

  summarizeWeatherCondition(weather) {
    if (!weather) return 'Unknown';
    
    if (weather.windSpeed > 15) return 'Strong Winds';
    if (weather.waveHeight > 3) return 'High Waves';
    if (Math.abs(weather.temperature - 20) > 15) return 'Extreme Temperature';
    return 'Moderate';
  }

  calculateTemperatureEffect(routes) {
    if (!routes.length) return 0;

    const temperatureDeviations = routes.map(route => {
      const optimalTemp = 20; // Assuming 20°C is optimal
      const actualTemp = route.weather.average.temperature;
      return Math.abs(actualTemp - optimalTemp);
    });

    const avgDeviation = temperatureDeviations.reduce((sum, dev) => sum + dev, 0) / routes.length;
    return (avgDeviation / 40) * 100; // Normalize to percentage (assuming max deviation of 40°C)
  }

  analyzeFuelEfficiencyImpact(routes) {
    if (!routes.length) return {
      averageIncrease: 0,
      peakIncrease: 0,
      recommendations: []
    };

    const impacts = routes.map(route => {
      const weatherSeverity = this.calculateWeatherSeverity(route.weather.average);
      const fuelIncrease = (route.fuelConsumption.actual - route.fuelConsumption.estimated) 
        / route.fuelConsumption.estimated * 100;
      return { weatherSeverity, fuelIncrease };
    });

    const averageIncrease = impacts.reduce((sum, imp) => sum + imp.fuelIncrease, 0) / impacts.length;
    const peakIncrease = Math.max(...impacts.map(imp => imp.fuelIncrease));

    const recommendations = this.generateWeatherRecommendations(impacts);

    return {
      averageIncrease,
      peakIncrease,
      recommendations
    };
  }

  calculateWeatherSeverity(weather) {
    if (!weather) return 0;

    const windFactor = weather.windSpeed / 50; // Normalize to 0-1 (max 50 m/s)
    const waveFactor = weather.waveHeight / 10; // Normalize to 0-1 (max 10m)
    const tempFactor = Math.abs(weather.temperature - 20) / 40; // Normalize to 0-1 (±40°C from optimal)

    return (windFactor + waveFactor + tempFactor) / 3;
  }

  generateWeatherRecommendations(impacts) {
    const recommendations = [];
    const avgImpact = impacts.reduce((sum, imp) => sum + imp.weatherSeverity, 0) / impacts.length;

    if (avgImpact > 0.7) {
      recommendations.push('Consider alternative routes during severe weather conditions');
    }
    if (avgImpact > 0.5) {
      recommendations.push('Implement weather-based route optimization');
    }
    if (avgImpact > 0.3) {
      recommendations.push('Monitor fuel consumption patterns in varying weather conditions');
    }

    return recommendations;
  }

  async getRouteById(routeId) {
    try {
      const route = await Route.findById(routeId)
        .populate('ship', 'name type fuelType')
        .exec();
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      return route;
    } catch (error) {
      logger.error('Failed to get route by ID:', error);
      throw error;
    }
  }
}

// Export the class
module.exports = RoutePlanningService;