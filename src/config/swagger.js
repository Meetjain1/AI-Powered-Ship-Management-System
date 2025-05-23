const swaggerJsdoc = require('swagger-jsdoc');

const serverUrl = process.env.NODE_ENV === 'production'
  ? 'https://ai-powered-ship-management-system.onrender.com'
  : 'http://localhost:3000';

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
        url: serverUrl,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ],
    schemes: ['https', 'http'],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Ship: {
          type: 'object',
          required: ['name', 'type', 'capacity'],
          properties: {
            _id: { 
              type: 'string', 
              pattern: '^[0-9a-fA-F]{24}$',
              description: 'MongoDB ObjectId'
            },
            name: { 
              type: 'string',
              example: 'Titanic'
            },
            type: { 
              type: 'string', 
              enum: ['CARGO', 'PASSENGER', 'TANKER'],
              example: 'CARGO'
            },
            capacity: { 
              type: 'number',
              example: 5000
            },
            fuelType: { 
              type: 'string',
              enum: ['HFO', 'MGO', 'LNG'],
              example: 'HFO'
            },
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
            status: { 
              type: 'string', 
              enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'],
              default: 'ACTIVE'
            },
            engineHours: { 
              type: 'number',
              default: 0
            },
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
            _id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            shipId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
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
            _id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            shipId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
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
  apis: ['./src/routes/*.js'],
};

// Override the server URL if we're in production
if (process.env.NODE_ENV === 'production') {
  options.definition.schemes = ['https'];
}

const specs = swaggerJsdoc(options);

// Ensure all URLs in production use HTTPS
if (process.env.NODE_ENV === 'production') {
  const replaceHttpWithHttps = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string' && obj[key].startsWith('http://')) {
        obj[key] = obj[key].replace('http://', 'https://');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        replaceHttpWithHttps(obj[key]);
      }
    }
  };
  replaceHttpWithHttps(specs);
}

module.exports = specs; 