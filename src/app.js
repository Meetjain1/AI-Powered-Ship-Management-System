const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { logger } = require('./utils/logger');
const path = require('path');

// Import routes
const routePlanningRoutes = require('./routes/routePlanning');
const maintenanceRoutes = require('./routes/maintenance');
const analyticsRoutes = require('./routes/analytics');
const shipsRoutes = require('./routes/ships');
const healthRouter = require('./routes/health');

// Create Express app
const app = express();

// Force production mode
const isProd = true; // process.env.NODE_ENV === 'production';
const prodUrl = 'https://ai-powered-ship-management-system.onrender.com';

// Force HTTPS
app.enable('trust proxy');
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next();
  } else {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
});

// CORS configuration
const corsOptions = {
  origin: [prodUrl, /\.onrender\.com$/],
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
  customSiteTitle: "Ship Management System API Documentation",
  swaggerOptions: {
    url: `${prodUrl}/api-docs/swagger.json`,
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

// Serve swagger.json
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Create a copy of the specs
  const specs = JSON.parse(JSON.stringify(swaggerSpecs));
  
  // Force production URL
  specs.servers = [{
    url: prodUrl,
    description: 'Production server'
  }];
  specs.schemes = ['https'];
  
  res.send(specs);
});

// API Documentation route
app.use(['/api-docs', '/'], swaggerUi.serve);
app.get(['/api-docs', '/'], (req, res) => {
  let html = swaggerUi.generateHTML(swaggerSpecs, {
    ...swaggerUiOptions,
    customJs: `
      window.onload = function() {
        if (window.ui) {
          window.ui.setServers([{
            url: '${prodUrl}',
            description: 'Production server'
          }]);
        }
      };
    `
  });
  
  // Force production URL
  html = html.replace(/http:\/\/localhost:3000/g, prodUrl);
  html = html.replace(/http:/g, 'https:');
  
  res.send(html);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = app; 