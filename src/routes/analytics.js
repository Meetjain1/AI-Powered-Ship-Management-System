const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const RoutePlanningService = require('../services/RoutePlanningService');
const MaintenanceService = require('../services/MaintenanceService');
const { logger } = require('../utils/logger');

// Create instances of services
const routePlanningService = new RoutePlanningService();
const maintenanceService = new MaintenanceService();

/**
 * @swagger
 * /api/v1/analytics/route-efficiency:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get route efficiency analytics
 *     description: Get efficiency analytics for ship routes
 *     parameters:
 *       - in: query
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly]
 *         default: monthly
 *     responses:
 *       200:
 *         description: Route efficiency analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRoutes:
 *                   type: number
 *                 averageFuelEfficiency:
 *                   type: number
 *                 routeOptimization:
 *                   type: number
 *                 weatherImpact:
 *                   type: object
 *                   properties:
 *                     windSpeedCorrelation:
 *                       type: number
 *                     waveHeightCorrelation:
 *                       type: number
 *                 trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                       fuelConsumption:
 *                         type: number
 *                       duration:
 *                         type: number
 *                       efficiency:
 *                         type: number
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/route-efficiency', [
  query('shipId').isMongoId(),
  query('timeframe').optional().isIn(['weekly', 'monthly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId, timeframe = 'monthly' } = req.query;
    const analytics = await routePlanningService.getRouteAnalytics(shipId, timeframe);
    res.json(analytics);
  } catch (error) {
    logger.error('Route efficiency analytics error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/analytics/fuel-consumption:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get fuel consumption analytics
 *     description: Get fuel consumption analytics and predictions for a ship
 *     parameters:
 *       - in: query
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly]
 *         default: monthly
 *     responses:
 *       200:
 *         description: Fuel consumption analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averageFuelEfficiency:
 *                   type: number
 *                 totalConsumption:
 *                   type: number
 *                 trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                       consumption:
 *                         type: number
 *                       efficiency:
 *                         type: number
 *                 predictions:
 *                   type: object
 *                   properties:
 *                     nextMonth:
 *                       type: number
 *                     confidence:
 *                       type: number
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/fuel-consumption', [
  query('shipId').isMongoId(),
  query('timeframe').optional().isIn(['weekly', 'monthly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId, timeframe = 'monthly' } = req.query;
    const analytics = await routePlanningService.getFuelConsumptionAnalytics(shipId, timeframe);
    res.json(analytics);
  } catch (error) {
    logger.error('Fuel consumption analytics error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/analytics/maintenance-insights:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get maintenance insights
 *     description: Get maintenance analytics and insights for a ship
 *     parameters:
 *       - in: query
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Maintenance insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averageCost:
 *                   type: number
 *                 averageDuration:
 *                   type: number
 *                 commonIssues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       frequency:
 *                         type: number
 *                 efficiency:
 *                   type: number
 *                 trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                       averageCost:
 *                         type: number
 *                       averageDuration:
 *                         type: number
 *                       maintenanceCount:
 *                         type: number
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/maintenance-insights', [
  query('shipId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId } = req.query;
    const insights = await maintenanceService.getMaintenanceInsights(shipId);
    res.json(insights);
  } catch (error) {
    logger.error('Maintenance insights error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/analytics/weather-impact:
 *   get:
 *     summary: Analyze weather impact on routes and fuel consumption
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Weather impact analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weatherImpact:
 *                   type: object
 *                   properties:
 *                     windSpeedEffect:
 *                       type: number
 *                       description: Impact of wind speed on fuel consumption (percentage)
 *                     waveHeightEffect:
 *                       type: number
 *                       description: Impact of wave height on fuel consumption (percentage)
 *                     temperatureEffect:
 *                       type: number
 *                       description: Impact of temperature on engine performance (percentage)
 *                 routeDeviations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       deviation:
 *                         type: number
 *                         description: Route deviation in nautical miles
 *                       weatherCondition:
 *                         type: string
 *                 fuelEfficiencyImpact:
 *                   type: object
 *                   properties:
 *                     averageIncrease:
 *                       type: number
 *                     peakIncrease:
 *                       type: number
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/weather-impact', [
  query('shipId').isMongoId(),
  query('timeframe').optional().isIn(['weekly', 'monthly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId, timeframe = 'monthly' } = req.query;
    const impact = await routePlanningService.analyzeWeatherImpactByShip(shipId, timeframe);
    res.json(impact);
  } catch (error) {
    logger.error('Weather impact analysis error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/analytics/performance-metrics:
 *   get:
 *     summary: Get overall ship performance metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overall:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       description: Overall performance score (0-100)
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                 routeEfficiency:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       description: Route optimization score (0-100)
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           efficiency:
 *                             type: number
 *                 fuelEfficiency:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       description: Fuel efficiency score (0-100)
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           consumption:
 *                             type: number
 *                 maintenanceHealth:
 *                   type: object
 *                   properties:
 *                     efficiency:
 *                       type: number
 *                       description: Maintenance efficiency score (0-100)
 *                     commonIssues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           frequency:
 *                             type: number
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           averageCost:
 *                             type: number
 *                           maintenanceCount:
 *                             type: number
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/performance-metrics', [
  query('shipId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId } = req.query;
    
    // Gather metrics
    const [routeEfficiency, fuelEfficiency, maintenanceInsights] = await Promise.all([
      routePlanningService.getRouteAnalytics(shipId),
      routePlanningService.getFuelConsumptionAnalytics(shipId),
      maintenanceService.getMaintenanceInsights(shipId)
    ]);

    // Combine metrics into a comprehensive performance report
    const metrics = {
      overall: {
        score: calculateOverallScore(routeEfficiency, fuelEfficiency),
        lastUpdated: new Date()
      },
      routeEfficiency: {
        score: routeEfficiency.routeOptimization || 0,
        trends: routeEfficiency.trends || []
      },
      fuelEfficiency: {
        score: fuelEfficiency.averageFuelEfficiency || 0,
        trends: fuelEfficiency.trends || []
      },
      maintenanceHealth: {
        efficiency: maintenanceInsights.efficiency || 0,
        commonIssues: maintenanceInsights.commonIssues || [],
        trends: maintenanceInsights.trends || []
      }
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Performance metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate overall score
function calculateOverallScore(routeEfficiency, fuelEfficiency) {
  const routeScore = routeEfficiency.routeOptimization || 0;
  const fuelScore = fuelEfficiency.averageFuelEfficiency || 0;
  
  // Simple average of available scores
  const scores = [routeScore, fuelScore].filter(score => !isNaN(score));
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

module.exports = router; 