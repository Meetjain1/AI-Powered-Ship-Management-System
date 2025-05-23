const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Ship = require('../models/Ship');
const { logger } = require('../utils/logger');

/**
 * @swagger
 * /api/v1/ships:
 *   post:
 *     summary: Create a new ship
 *     tags: [Ships]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Titanic"
 *               type:
 *                 type: string
 *                 enum: [CARGO, TANKER, PASSENGER]
 *                 example: "CARGO"
 *               capacity:
 *                 type: number
 *                 example: 5000
 *               fuelType:
 *                 type: string
 *                 enum: [HFO, MGO, LNG]
 *                 example: "HFO"
 *     responses:
 *       201:
 *         description: Ship created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ship'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Ship with this name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', [
  body('name').isString().trim().notEmpty(),
  body('type').isIn(['CARGO', 'TANKER', 'PASSENGER']),
  body('capacity').isFloat({ min: 0 }),
  body('fuelType').optional().isIn(['HFO', 'MGO', 'LNG'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const ship = await Ship.create({
      ...req.body,
      status: 'ACTIVE',
      engineHours: 0
    });

    res.status(201).json(ship);
  } catch (error) {
    logger.error('Ship creation error:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Ship with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/ships/{shipId}:
 *   get:
 *     summary: Get ship details
 *     tags: [Ships]
 *     parameters:
 *       - in: path
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Ship details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ship'
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
router.get('/:shipId', async (req, res) => {
  try {
    const ship = await Ship.findById(req.params.shipId)
      .populate('maintenanceHistory')
      .populate('routes');

    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }

    res.json(ship);
  } catch (error) {
    logger.error('Ship retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/ships:
 *   get:
 *     summary: List all ships
 *     tags: [Ships]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CARGO, TANKER, PASSENGER, CONTAINER]
 *       - in: query
 *         name: fuelType
 *         schema:
 *           type: string
 *           enum: [HFO, MGO, LNG]
 *     responses:
 *       200:
 *         description: List of ships retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ship'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { type, fuelType } = req.query;
    const query = {};

    if (type) query.type = type;
    if (fuelType) query.fuelType = fuelType;

    const ships = await Ship.find(query)
      .select('-maintenanceHistory -routes')
      .sort('name');

    res.json(ships);
  } catch (error) {
    logger.error('Ships listing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/ships/{shipId}:
 *   put:
 *     summary: Update ship details
 *     tags: [Ships]
 *     parameters:
 *       - in: path
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Titanic II"
 *               type:
 *                 type: string
 *                 enum: [CARGO, TANKER, PASSENGER, CONTAINER]
 *                 example: "PASSENGER"
 *               capacity:
 *                 type: number
 *                 example: 6000
 *               fuelType:
 *                 type: string
 *                 enum: [HFO, MGO, LNG]
 *                 example: "LNG"
 *     responses:
 *       200:
 *         description: Ship updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ship'
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
 *       409:
 *         description: Ship with this name already exists
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
router.put('/:shipId', [
  body('name').optional().isString().trim().notEmpty(),
  body('type').optional().isIn(['CARGO', 'TANKER', 'PASSENGER', 'CONTAINER']),
  body('capacity').optional().isFloat({ min: 0 }),
  body('fuelType').optional().isIn(['HFO', 'MGO', 'LNG'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ship = await Ship.findByIdAndUpdate(
      req.params.shipId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }

    res.json(ship);
  } catch (error) {
    logger.error('Ship update error:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Ship with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/ships/{shipId}:
 *   delete:
 *     summary: Delete a ship
 *     tags: [Ships]
 *     parameters:
 *       - in: path
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       204:
 *         description: Ship deleted successfully
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
router.delete('/:shipId', async (req, res) => {
  try {
    const ship = await Ship.findByIdAndDelete(req.params.shipId);

    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }

    res.status(204).end();
  } catch (error) {
    logger.error('Ship deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/ships/{shipId}/engine-hours:
 *   put:
 *     summary: Update ship engine hours
 *     tags: [Ships]
 *     parameters:
 *       - in: path
 *         name: shipId
 *         required: true
 *         description: MongoDB ObjectId of the ship
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
 *               - hours
 *             properties:
 *               hours:
 *                 type: number
 *                 minimum: 0
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Engine hours updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ship'
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
router.put('/:shipId/engine-hours', [
  body('hours').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ship = await Ship.findByIdAndUpdate(
      req.params.shipId,
      { $set: { engineHours: req.body.hours } },
      { new: true }
    );

    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }

    // Check if maintenance is needed based on engine hours
    if (ship.engineHours >= 5000) {
      ship.calculateNextMaintenance();
      await ship.save();
    }

    res.json(ship);
  } catch (error) {
    logger.error('Engine hours update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 