const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Maintenance:
 *       type: object
 *       required:
 *         - ship
 *         - type
 *         - date
 *       properties:
 *         ship:
 *           type: string
 *           description: Reference to the Ship model
 *         type:
 *           type: string
 *           enum: [ROUTINE, REPAIR, EMERGENCY, INSPECTION]
 *         date:
 *           type: string
 *           format: date-time
 *         description:
 *           type: string
 *         cost:
 *           type: number
 *         status:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 */
const maintenanceSchema = new mongoose.Schema({
  ship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ship',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['ROUTINE', 'REPAIR', 'EMERGENCY', 'INSPECTION']
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tasks: [{
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'PENDING'
    },
    estimatedDuration: {
      type: Number, // in hours
      required: true
    },
    actualDuration: Number,
    notes: String
  }],
  parts: [{
    name: String,
    quantity: Number,
    cost: Number
  }],
  cost: {
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
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  technicians: [{
    name: String,
    specialization: String,
    hours: Number
  }],
  documents: [{
    type: {
      type: String,
      enum: ['REPORT', 'INVOICE', 'CERTIFICATE', 'OTHER']
    },
    name: String,
    url: String
  }],
  notes: String
}, {
  timestamps: true
});

// Indexes
maintenanceSchema.index({ ship: 1 });
maintenanceSchema.index({ date: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ type: 1 });

// Methods
maintenanceSchema.methods.calculateTotalCost = function() {
  let totalCost = 0;
  
  // Add parts cost
  if (this.parts && this.parts.length > 0) {
    totalCost += this.parts.reduce((sum, part) => sum + (part.cost * part.quantity), 0);
  }
  
  // Add labor cost (assuming $50 per hour per technician)
  if (this.technicians && this.technicians.length > 0) {
    totalCost += this.technicians.reduce((sum, tech) => sum + (tech.hours * 50), 0);
  }
  
  this.cost.actual = totalCost;
  return totalCost;
};

maintenanceSchema.methods.updateStatus = function() {
  if (!this.tasks || this.tasks.length === 0) return this.status;

  const totalTasks = this.tasks.length;
  const completedTasks = this.tasks.filter(task => task.status === 'COMPLETED').length;
  const inProgressTasks = this.tasks.filter(task => task.status === 'IN_PROGRESS').length;

  if (completedTasks === totalTasks) {
    this.status = 'COMPLETED';
  } else if (inProgressTasks > 0) {
    this.status = 'IN_PROGRESS';
  }

  return this.status;
};

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);

module.exports = Maintenance; 