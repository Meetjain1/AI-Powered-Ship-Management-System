const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const RoutePlanningService = require('../services/RoutePlanningService');
const { logger } = require('../utils/logger');

// Create an instance of RoutePlanningService
const routePlanningService = new RoutePlanningService();

/**
 * @swagger
 * /api/v1/route-plan:
 *   post:
 *     tags:
 *       - Route Planning
 *     summary: Create a new route plan
 *     description: Plan a new route for a ship with optimized waypoints and weather consideration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipId
 *               - departure
 *               - destination
 *             properties:
 *               shipId:
 *                 type: string
 *                 description: MongoDB ObjectId of the ship
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 example: "507f1f77bcf86cd799439011"
 *               departure:
 *                 type: object
 *                 required:
 *                   - coordinates
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 2
 *                     maxItems: 2
 *                     description: [longitude, latitude]
 *                     example: [0, 0]
 *                   port:
 *                     type: string
 *               destination:
 *                 type: object
 *                 required:
 *                   - coordinates
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 2
 *                     maxItems: 2
 *                     description: [longitude, latitude]
 *                     example: [0, 0]
 *                   port:
 *                     type: string
 *               estimatedDeparture:
 *                 type: string
 *                 format: date-time
 *               cargoWeight:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Route plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Invalid input data
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
router.post('/', [
  body('shipId').isMongoId().withMessage('Invalid ship ID format'),
  body('departure.coordinates').isArray().withMessage('Departure coordinates must be an array')
    .custom((value) => {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Coordinates must be an array of [longitude, latitude]');
      }
      const [longitude, latitude] = value;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),
  body('destination.coordinates').isArray().withMessage('Destination coordinates must be an array')
    .custom((value) => {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Coordinates must be an array of [longitude, latitude]');
      }
      const [longitude, latitude] = value;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),
  body('estimatedDeparture').optional().isISO8601().withMessage('Invalid date format'),
  body('cargoWeight').optional().isFloat({ min: 0 }).withMessage('Cargo weight must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const routePlan = await routePlanningService.planRoute(req.body);
    res.status(201).json(routePlan);
  } catch (error) {
    logger.error('Route planning error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Invalid route data')) {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Weather forecast service unavailable') {
      // Still create the route but with a warning
      res.status(201).json({
        ...await routePlanningService.planRoute(req.body),
        warning: 'Route created without weather data. Weather service unavailable.'
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/route-plan/{routeId}/status:
 *   put:
 *     tags:
 *       - Route Planning
 *     summary: Update route status
 *     description: Update the status of an existing route
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         description: MongoDB ObjectId of the route
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PLANNED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Route status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:routeId/status', [
  body('status').isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { routeId } = req.params;
    const { status } = req.body;

    const updatedRoute = await routePlanningService.updateRouteStatus(routeId, status);
    res.json(updatedRoute);
  } catch (error) {
    logger.error('Route status update error:', error);
    if (error.message === 'Route not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/route-plan/fuel-estimate:
 *   get:
 *     summary: Get fuel consumption estimate for a route
 *     tags: [Route Planning]
 *     parameters:
 *       - in: query
 *         name: routeId
 *         required: true
 *         description: MongoDB ObjectId of the route
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Fuel consumption estimate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 estimatedFuel:
 *                   type: number
 *                 unit:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                 factors:
 *                   type: object
 *                   properties:
 *                     distance: 
 *                       type: number
 *                     weather:
 *                       type: object
 *                     cargoWeight:
 *                       type: number
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/fuel-estimate', [
  query('routeId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { routeId } = req.query;
    const route = await routePlanningService.getRouteById(routeId);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({
      estimatedFuel: route.fuelConsumption.estimated,
      unit: 'liters',
      confidence: 0.95,
      factors: {
        distance: route.distance,
        weather: route.weather.average,
        cargoWeight: route.cargoWeight
      }
    });
  } catch (error) {
    logger.error('Fuel estimation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/route-plan/{routeId}:
 *   get:
 *     tags:
 *       - Route Planning
 *     summary: Get route details
 *     description: Retrieve details of a specific route
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         description: MongoDB ObjectId of the route
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Route details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await routePlanningService.getRouteById(routeId);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    logger.error('Route retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 