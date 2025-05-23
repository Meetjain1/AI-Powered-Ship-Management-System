const Ship = require('../models/Ship');
const Maintenance = require('../models/Maintenance');
const { logger } = require('../utils/logger');

class MaintenanceService {
  async scheduleMaintenance(shipId) {
    try {
      const ship = await Ship.findById(shipId)
        .populate('maintenanceHistory')
        .populate('routes');

      if (!ship) {
        throw new Error('Ship not found');
      }

      // Calculate next maintenance based on various factors
      const nextMaintenance = await this.predictNextMaintenance(ship);

      // Create maintenance schedule
      const maintenance = await Maintenance.create({
        ship: ship._id,
        type: 'ROUTINE',
        date: nextMaintenance.date,
        description: 'Scheduled routine maintenance',
        tasks: this.generateMaintenanceTasks(ship, nextMaintenance.factors),
        cost: {
          estimated: this.estimateMaintenanceCost(nextMaintenance.tasks)
        }
      });

      // Update ship's maintenance history
      await Ship.findByIdAndUpdate(
        shipId,
        { 
          $push: { maintenanceHistory: maintenance._id },
          nextMaintenance: maintenance.date
        }
      );

      return maintenance;
    } catch (error) {
      logger.error('Failed to schedule maintenance:', error);
      throw error;
    }
  }

  async predictNextMaintenance(ship) {
    // Get last maintenance date
    const lastMaintenance = ship.maintenanceHistory && ship.maintenanceHistory.length > 0 ?
      ship.maintenanceHistory.sort((a, b) => b.date - a.date)[0] : null;

    // Calculate factors affecting maintenance timing
    const factors = {
      engineHours: this.calculateEngineHours(ship),
      routeIntensity: this.calculateRouteIntensity(ship.routes || []),
      weatherImpact: this.calculateWeatherImpact(ship.routes || []),
      lastMaintenanceAge: lastMaintenance ? 
        (Date.now() - lastMaintenance.date) / (1000 * 60 * 60 * 24) : 180 // Default to 180 days if no maintenance history
    };

    // Calculate risk score (0-1)
    const riskScore = this.calculateRiskScore(factors);

    // Determine next maintenance date based on risk score
    const daysUntilMaintenance = this.calculateDaysUntilMaintenance(riskScore);
    const nextMaintenanceDate = new Date();
    nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + daysUntilMaintenance);

    return {
      date: nextMaintenanceDate,
      factors,
      riskScore
    };
  }

  calculateEngineHours(ship) {
    return {
      total: ship.engineHours,
      sinceLastMaintenance: ship.engineHours % 5000, // Assuming maintenance every 5000 hours
      hoursPerDay: ship.routes.length > 0 ? 
        ship.engineHours / (ship.routes.length * 30) : 0 // Rough estimate
    };
  }

  calculateRouteIntensity(routes) {
    if (!routes || routes.length === 0) {
      return {
        averageDistance: 0,
        averageSpeed: 0,
        routesPerMonth: 0
      };
    }

    const recentRoutes = routes
      .filter(r => r.status === 'COMPLETED')
      .sort((a, b) => b.actualArrival - a.actualArrival)
      .slice(0, 10);

    if (recentRoutes.length === 0) {
      return {
        averageDistance: 0,
        averageSpeed: 0,
        routesPerMonth: 0
      };
    }

    const totalDistance = recentRoutes.reduce((sum, r) => sum + r.distance, 0);
    const avgSpeed = recentRoutes.reduce((sum, r) => {
      const duration = (r.actualArrival - r.actualDeparture) / (1000 * 60 * 60);
      return sum + (r.distance / duration);
    }, 0) / recentRoutes.length;

    return {
      averageDistance: totalDistance / recentRoutes.length,
      averageSpeed: avgSpeed,
      routesPerMonth: (recentRoutes.length / 3) // Last 3 months
    };
  }

  calculateWeatherImpact(routes) {
    if (!routes || routes.length === 0) return 0;

    const recentRoutes = routes
      .filter(r => r.status === 'COMPLETED' && r.weather && r.weather.average)
      .sort((a, b) => b.actualArrival - a.actualArrival)
      .slice(0, 10);

    if (recentRoutes.length === 0) return 0;

    return recentRoutes.reduce((sum, route) => {
      const weather = route.weather.average;
      // Calculate weather severity (0-1)
      const severity = (
        (weather.windSpeed / 50) + // Assuming max wind speed of 50 m/s
        (weather.waveHeight / 10) + // Assuming max wave height of 10m
        (Math.abs(weather.temperature - 20) / 40) // Temperature deviation from optimal
      ) / 3;

      return sum + severity;
    }, 0) / recentRoutes.length;
  }

  calculateRiskScore(factors) {
    const weights = {
      engineHours: 0.4,
      routeIntensity: 0.3,
      weatherImpact: 0.2,
      lastMaintenanceAge: 0.1
    };

    const engineHoursScore = Math.min(factors.engineHours.sinceLastMaintenance / 5000, 1);
    const routeIntensityScore = Math.min(factors.routeIntensity.routesPerMonth / 10, 1);
    const weatherImpactScore = factors.weatherImpact;
    const ageScore = Math.min(factors.lastMaintenanceAge / 180, 1); // 6 months max

    return (
      engineHoursScore * weights.engineHours +
      routeIntensityScore * weights.routeIntensity +
      weatherImpactScore * weights.weatherImpact +
      ageScore * weights.lastMaintenanceAge
    );
  }

  calculateDaysUntilMaintenance(riskScore) {
    // Base maintenance interval is 180 days (6 months)
    const baseInterval = 180;
    // Minimum interval is 30 days
    const minInterval = 30;
    // Calculate days based on risk score (higher risk = fewer days)
    return Math.max(minInterval, Math.round(baseInterval * (1 - riskScore)));
  }

  generateMaintenanceTasks(ship, factors) {
    const tasks = [
      {
        name: 'Engine Inspection',
        estimatedDuration: 4,
        status: 'PENDING'
      },
      {
        name: 'Hull Inspection',
        estimatedDuration: 3,
        status: 'PENDING'
      },
      {
        name: 'Safety Equipment Check',
        estimatedDuration: 2,
        status: 'PENDING'
      }
    ];

    // Add conditional tasks based on factors
    if (factors.engineHours.sinceLastMaintenance > 4000) {
      tasks.push({
        name: 'Engine Oil Change',
        estimatedDuration: 2,
        status: 'PENDING'
      });
    }

    if (factors.weatherImpact > 0.7) {
      tasks.push({
        name: 'Weather Damage Inspection',
        estimatedDuration: 3,
        status: 'PENDING'
      });
    }

    if (factors.routeIntensity.averageSpeed > 20) {
      tasks.push({
        name: 'Propulsion System Check',
        estimatedDuration: 4,
        status: 'PENDING'
      });
    }

    return tasks;
  }

  estimateMaintenanceCost(tasks) {
    if (!tasks || tasks.length === 0) {
      return 1000; // Base cost
    }

    // Base cost for facility and equipment
    let baseCost = 1000;

    // Labor cost ($50 per hour per task)
    const laborCost = tasks.reduce((sum, task) => sum + (task.estimatedDuration * 50), 0);

    // Parts cost (estimated)
    const partsCost = tasks.reduce((sum, task) => {
      switch (task.name) {
        case 'Engine Oil Change':
          return sum + 500;
        case 'Engine Inspection':
          return sum + 300;
        case 'Hull Inspection':
          return sum + 200;
        default:
          return sum + 100;
      }
    }, 0);

    return baseCost + laborCost + partsCost;
  }

  async updateMaintenanceStatus(maintenanceId, status, completedTasks = []) {
    try {
      const maintenance = await Maintenance.findById(maintenanceId);
      if (!maintenance) {
        throw new Error('Maintenance record not found');
      }

      maintenance.status = status;

      if (completedTasks.length > 0) {
        completedTasks.forEach(taskId => {
          const task = maintenance.tasks.id(taskId);
          if (task) {
            task.status = 'COMPLETED';
            task.actualDuration = task.estimatedDuration; // Could be updated with actual duration
          }
        });
      }

      if (status === 'COMPLETED') {
        maintenance.cost.actual = maintenance.calculateTotalCost();
        
        // Update ship's last maintenance date
        await Ship.findByIdAndUpdate(maintenance.ship, {
          lastMaintenance: new Date(),
          $inc: { engineHours: 0 } // Reset engine hours if needed
        });
      }

      await maintenance.save();
      return maintenance;
    } catch (error) {
      logger.error('Failed to update maintenance status:', error);
      throw error;
    }
  }

  async getMaintenanceHistory(shipId, status = null) {
    try {
      const query = { ship: shipId };
      if (status) {
        query.status = status;
      }

      const history = await Maintenance.find(query)
        .sort('-date')
        .populate('ship', 'name type');

      return history;
    } catch (error) {
      logger.error('Failed to get maintenance history:', error);
      throw error;
    }
  }

  async getMaintenanceInsights(shipId) {
    try {
      const ship = await Ship.findById(shipId).populate('maintenanceHistory');
      if (!ship) {
        throw new Error('Ship not found');
      }

      const maintenanceHistory = ship.maintenanceHistory || [];
      const completedMaintenance = maintenanceHistory.filter(m => m.status === 'COMPLETED');

      if (completedMaintenance.length === 0) {
        return {
          averageCost: 0,
          averageDuration: 0,
          commonIssues: [],
          efficiency: 0,
          trends: []
        };
      }

      // Calculate average cost and duration
      const averageCost = completedMaintenance.reduce((sum, m) => sum + m.cost.actual, 0) / completedMaintenance.length;
      const averageDuration = completedMaintenance.reduce((sum, m) => {
        const duration = (m.completedAt - m.startedAt) / (1000 * 60 * 60); // hours
        return sum + duration;
      }, 0) / completedMaintenance.length;

      // Analyze common issues
      const allTasks = completedMaintenance.flatMap(m => m.tasks);
      const taskCounts = allTasks.reduce((acc, task) => {
        acc[task.name] = (acc[task.name] || 0) + 1;
        return acc;
      }, {});

      const commonIssues = Object.entries(taskCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, frequency: count }));

      // Calculate maintenance efficiency
      const efficiency = completedMaintenance.reduce((sum, m) => {
        const costEfficiency = m.cost.estimated ? (m.cost.estimated - m.cost.actual) / m.cost.estimated : 0;
        const timeEfficiency = m.estimatedDuration ? 
          (m.estimatedDuration - ((m.completedAt - m.startedAt) / (1000 * 60 * 60))) / m.estimatedDuration : 0;
        return sum + (costEfficiency + timeEfficiency) / 2;
      }, 0) / completedMaintenance.length;

      // Calculate trends
      const trends = this.calculateMaintenanceTrends(completedMaintenance);

      return {
        averageCost,
        averageDuration,
        commonIssues,
        efficiency,
        trends
      };
    } catch (error) {
      logger.error('Failed to get maintenance insights:', error);
      throw error;
    }
  }

  calculateMaintenanceTrends(maintenanceHistory) {
    const monthlyData = maintenanceHistory.reduce((acc, maintenance) => {
      const date = new Date(maintenance.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          cost: 0,
          duration: 0,
          count: 0
        };
      }

      acc[monthKey].cost += maintenance.cost.actual;
      acc[monthKey].duration += (maintenance.completedAt - maintenance.startedAt) / (1000 * 60 * 60);
      acc[monthKey].count += 1;

      return acc;
    }, {});

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        averageCost: data.cost / data.count,
        averageDuration: data.duration / data.count,
        maintenanceCount: data.count
      }));
  }

  async getMaintenanceById(maintenanceId) {
    try {
      const maintenance = await Maintenance.findById(maintenanceId)
        .populate('ship', 'name type');
      return maintenance;
    } catch (error) {
      logger.error('Failed to get maintenance details:', error);
      throw error;
    }
  }

  async addMaintenanceTasks(maintenanceId, tasks) {
    try {
      const maintenance = await Maintenance.findById(maintenanceId);
      if (!maintenance) {
        throw new Error('Maintenance record not found');
      }

      // Add status to each task
      const tasksWithStatus = tasks.map(task => ({
        ...task,
        status: 'PENDING'
      }));

      // Add new tasks
      maintenance.tasks.push(...tasksWithStatus);

      // Update estimated cost
      maintenance.cost.estimated = this.estimateMaintenanceCost(maintenance.tasks);

      await maintenance.save();
      return maintenance;
    } catch (error) {
      logger.error('Failed to add maintenance tasks:', error);
      throw error;
    }
  }
}

// Export the class
module.exports = MaintenanceService; 