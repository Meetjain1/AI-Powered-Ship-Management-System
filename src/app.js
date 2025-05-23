const healthRouter = require('./routes/health');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger-specs');

app.use('/api/v1/health', healthRouter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Ship Management System API Documentation"
}));

// Export the app
module.exports = app; 