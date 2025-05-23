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

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Ship Management System API Documentation",
  swaggerOptions: {
    url: process.env.NODE_ENV === 'production' 
      ? 'https://ai-powered-ship-management-system.onrender.com/api-docs/swagger.json'
      : '/api-docs/swagger.json',
    supportedSubmitMethods: ['get', 'post', 'put', 'delete'],
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    docExpansion: 'list',
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http', 'https']
  }
}));

// Root route - redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Routes
app.use('/api/v1/ships', shipsRoutes);
app.use('/api/v1/route-plan', routePlanningRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/health', healthRouter);

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: err.message });
});

module.exports = app; 