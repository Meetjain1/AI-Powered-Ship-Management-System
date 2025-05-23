const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { logger } = require('./utils/logger');

// Import routes
const routePlanningRoutes = require('./routes/routePlanning');
const maintenanceRoutes = require('./routes/maintenance');
const analyticsRoutes = require('./routes/analytics');
const shipsRoutes = require('./routes/ships');
const healthRouter = require('./routes/health');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Ship Management System API Documentation"
}));

// Routes
app.use('/api/v1/ships', shipsRoutes);
app.use('/api/v1/route-plan', routePlanningRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/health', healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: err.message });
});

module.exports = app; 