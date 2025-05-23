const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ship Management System API',
      version: '1.0.0',
      description: 'API documentation for Ship Management System',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://ai-powered-ship-management-system.onrender.com'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      schemas: {
        Ship: {
          type: 'object',
          properties: {
            _id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['CARGO', 'PASSENGER', 'TANKER'] },
            capacity: { type: 'number' },
            fuelType: { type: 'string' },
            currentLocation: {
              type: 'object',
              properties: {
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 2,
                },
              },
            },
            status: { type: 'string', enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] },
            engineHours: { type: 'number' },
            maintenanceHistory: { 
              type: 'array',
              items: { $ref: '#/components/schemas/Maintenance' }
            },
            routes: {
              type: 'array',
              items: { $ref: '#/components/schemas/Route' }
            }
          },
        },
        Route: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'uuid' },
            shipId: { type: 'string', format: 'uuid' },
            departure: {
              type: 'object',
              properties: {
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 2,
                },
                port: { type: 'string' },
              },
            },
            destination: {
              type: 'object',
              properties: {
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 2,
                },
                port: { type: 'string' },
              },
            },
            estimatedDeparture: { type: 'string', format: 'date-time' },
            estimatedArrival: { type: 'string', format: 'date-time' },
            actualDeparture: { type: 'string', format: 'date-time' },
            actualArrival: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
            cargoWeight: { type: 'number' },
            distance: { type: 'number' },
            fuelConsumption: {
              type: 'object',
              properties: {
                estimated: { type: 'number' },
                actual: { type: 'number' }
              }
            },
            weather: {
              type: 'object',
              properties: {
                departure: { type: 'object' },
                destination: { type: 'object' },
                average: { type: 'object' }
              }
            }
          },
        },
        Maintenance: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'uuid' },
            shipId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['ROUTINE', 'EMERGENCY', 'SCHEDULED'] },
            date: { type: 'string', format: 'date-time' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  estimatedDuration: { type: 'number' },
                  status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] }
                }
              }
            },
            cost: {
              type: 'object',
              properties: {
                estimated: { type: 'number' },
                actual: { type: 'number' }
              }
            }
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      },
    },
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs; 