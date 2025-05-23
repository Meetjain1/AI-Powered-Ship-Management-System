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

const isProd = process.env.NODE_ENV === 'production';
const prodUrl = 'https://ai-powered-ship-management-system.onrender.com';

// Force HTTPS in production
if (isProd) {
  app.enable('trust proxy');
  app.use((req, res, next) => {
    if (req.secure) {
      next();
    } else {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  });
}

// CORS configuration
const corsOptions = {
  origin: isProd ? [prodUrl, /\.onrender\.com$/] : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Swagger UI configuration
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Ship Management System API Documentation",
  swaggerOptions: {
    url: isProd ? `${prodUrl}/api-docs/swagger.json` : '/api-docs/swagger.json',
    displayRequestDuration: true,
    persistAuthorization: true,
    tryItOutEnabled: true,
    docExpansion: 'list',
    filter: true,
    syntaxHighlight: {
      theme: 'monokai'
    }
  }
};

// API Documentation
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerUiOptions));

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