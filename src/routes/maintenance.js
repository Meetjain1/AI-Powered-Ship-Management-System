const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const MaintenanceService = require('../services/MaintenanceService');
const { logger } = require('../utils/logger');

// Create an instance of MaintenanceService
const maintenanceService = new MaintenanceService();

/**
 * @swagger
 * /api/v1/maintenance/schedule:
 *   post:
 *     summary: Schedule maintenance for a ship
 *     tags: [Maintenance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipId
 *             properties:
 *               shipId:
 *                 type: string
 *                 description: MongoDB ObjectId of the ship
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       201:
 *         description: Maintenance scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Maintenance'
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
router.post('/schedule', [
  body('shipId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId } = req.body;
    const maintenance = await maintenanceService.scheduleMaintenance(shipId);
    res.status(201).json(maintenance);
  } catch (error) {
    logger.error('Maintenance scheduling error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/maintenance/{maintenanceId}/status:
 *   put:
 *     summary: Update maintenance status
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: maintenanceId
 *         required: true
 *         description: MongoDB ObjectId of the maintenance record
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
 *                 enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *               completedTasks:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: MongoDB ObjectId of the completed task
 *     responses:
 *       200:
 *         description: Maintenance status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Maintenance'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Maintenance record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:maintenanceId/status', [
  body('status').isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('completedTasks').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { maintenanceId } = req.params;
    const { status, completedTasks = [] } = req.body;

    const maintenance = await maintenanceService.updateMaintenanceStatus(
      maintenanceId,
      status,
      completedTasks
    );

    res.json(maintenance);
  } catch (error) {
    logger.error('Maintenance status update error:', error);
    if (error.message === 'Maintenance record not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/maintenance/history:
 *   get:
 *     summary: Get maintenance history for a ship
 *     tags: [Maintenance]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Maintenance history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Maintenance'
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
router.get('/history', [
  query('shipId').isMongoId(),
  query('status').optional().isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shipId, status } = req.query;
    const history = await maintenanceService.getMaintenanceHistory(shipId, status);
    res.json(history);
  } catch (error) {
    logger.error('Maintenance history retrieval error:', error);
    if (error.message === 'Ship not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/v1/maintenance/{maintenanceId}:
 *   get:
 *     summary: Get maintenance details
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: maintenanceId
 *         required: true
 *         description: MongoDB ObjectId of the maintenance record
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Maintenance details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Maintenance'
 *       404:
 *         description: Maintenance record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:maintenanceId', async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }

    res.json(maintenance);
  } catch (error) {
    logger.error('Maintenance retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/maintenance/{maintenanceId}/tasks:
 *   post:
 *     summary: Add tasks to maintenance schedule
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: maintenanceId
 *         required: true
 *         description: MongoDB ObjectId of the maintenance record
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
 *               - tasks
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - estimatedDuration
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Engine Oil Change"
 *                     estimatedDuration:
 *                       type: number
 *                       minimum: 0
 *                       example: 2
 *                     notes:
 *                       type: string
 *                       example: "Use synthetic oil type XYZ"
 *     responses:
 *       201:
 *         description: Tasks added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Maintenance'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Maintenance record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:maintenanceId/tasks', [
  body('tasks').isArray(),
  body('tasks.*.name').isString(),
  body('tasks.*.estimatedDuration').isFloat({ min: 0 }),
  body('tasks.*.notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { maintenanceId } = req.params;
    const { tasks } = req.body;

    const maintenance = await maintenanceService.addMaintenanceTasks(
      maintenanceId,
      tasks
    );

    res.status(201).json(maintenance);
  } catch (error) {
    logger.error('Adding maintenance tasks error:', error);
    if (error.message === 'Maintenance record not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router; 