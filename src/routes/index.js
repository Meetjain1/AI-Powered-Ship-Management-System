const express = require('express');
const router = express.Router();

const routePlanningRoutes = require('./routePlanning');
const maintenanceRoutes = require('./maintenance');
const analyticsRoutes = require('./analytics');
const shipRoutes = require('./ships');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
router.use('/ships', shipRoutes);
router.use('/route-plan', routePlanningRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/analytics', analyticsRoutes);

// Error handling for invalid routes
router.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router; 