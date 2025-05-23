const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Route:
 *       type: object
 *       required:
 *         - ship
 *         - departure
 *         - destination
 *         - estimatedDeparture
 *       properties:
 *         ship:
 *           type: string
 *           description: Reference to the Ship model
 *         departure:
 *           type: object
 *           properties:
 *             port:
 *               type: string
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *         destination:
 *           type: object
 *           properties:
 *             port:
 *               type: string
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *         status:
 *           type: string
 *           enum: [PLANNED, IN_PROGRESS, COMPLETED, CANCELLED]
 */
const routeSchema = new mongoose.Schema({
  ship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ship',
    required: true
  },
  departure: {
    port: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  destination: {
    port: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  estimatedDeparture: {
    type: Date,
    required: true
  },
  estimatedArrival: {
    type: Date,
    required: true
  },
  actualDeparture: {
    type: Date
  },
  actualArrival: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PLANNED'
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  weather: [{
    timestamp: Date,
    windSpeed: Number,
    windDirection: Number,
    waveHeight: Number,
    temperature: Number
  }],
  fuelConsumption: {
    estimated: {
      type: Number,
      required: true,
      min: 0
    },
    actual: {
      type: Number,
      min: 0
    }
  },
  waypoints: [{
    coordinates: {
      type: [Number],
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    },
    estimatedArrival: Date,
    actualArrival: Date
  }]
}, {
  timestamps: true
});

// Indexes
routeSchema.index({ ship: 1 });
routeSchema.index({ status: 1 });
routeSchema.index({ estimatedDeparture: 1 });
routeSchema.index({ 'departure.port': 1, 'destination.port': 1 });

// Methods
routeSchema.methods.calculateDistance = function() {
  // Haversine formula for calculating distance between coordinates
  const R = 6371; // Earth's radius in km
  const toRad = (x) => (x * Math.PI) / 180;

  const lat1 = this.departure.coordinates[1];
  const lon1 = this.departure.coordinates[0];
  const lat2 = this.destination.coordinates[1];
  const lon2 = this.destination.coordinates[0];

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
           Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km

  this.distance = distance;
  return distance;
};

const Route = mongoose.model('Route', routeSchema);

module.exports = Route; 