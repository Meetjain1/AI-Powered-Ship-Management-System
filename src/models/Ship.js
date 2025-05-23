const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Ship:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the ship
 *         type:
 *           type: string
 *           enum: [CARGO, TANKER, PASSENGER, CONTAINER]
 *         capacity:
 *           type: number
 *           description: Cargo capacity in metric tons
 *         fuelType:
 *           type: string
 *           enum: [HFO, MGO, LNG]
 *         engineHours:
 *           type: number
 *           default: 0
 *         lastMaintenance:
 *           type: date
 *         nextMaintenance:
 *           type: date
 */
const shipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['CARGO', 'TANKER', 'PASSENGER', 'CONTAINER'],
    index: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['HFO', 'MGO', 'LNG'],
    default: 'HFO'
  },
  engineHours: {
    type: Number,
    default: 0,
    min: 0
  },
  lastMaintenance: {
    type: Date,
    default: Date.now
  },
  nextMaintenance: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setMonth(date.getMonth() + 6);
      return date;
    }
  },
  maintenanceHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  }],
  routes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }]
}, {
  timestamps: true
});

// Methods
shipSchema.methods.calculateNextMaintenance = function() {
  const hoursUntilMaintenance = 5000 - (this.engineHours % 5000);
  const estimatedDate = new Date();
  estimatedDate.setHours(estimatedDate.getHours() + hoursUntilMaintenance);
  this.nextMaintenance = estimatedDate;
  return estimatedDate;
};

const Ship = mongoose.model('Ship', shipSchema);

module.exports = Ship; 