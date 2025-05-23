const MaintenanceService = require('../src/services/MaintenanceService');
const Ship = require('../src/models/Ship');
const Route = require('../src/models/Route');
const Maintenance = require('../src/models/Maintenance');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Ship.deleteMany({});
  await Route.deleteMany({});
  await Maintenance.deleteMany({});
});

describe('Maintenance Service', () => {
  describe('Maintenance Scheduling', () => {
    let ship;

    beforeEach(async () => {
      ship = await Ship.create({
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO',
        engineHours: 4500
      });

      // Create some test routes
      await Route.create([
        {
          ship: ship._id,
          departure: { port: 'Port A', coordinates: [0, 0] },
          destination: { port: 'Port B', coordinates: [1, 1] },
          status: 'COMPLETED',
          distance: 1000,
          weather: {
            average: {
              windSpeed: 15,
              waveHeight: 2,
              temperature: 20
            }
          },
          estimatedDeparture: new Date('2024-01-01'),
          actualDeparture: new Date('2024-01-01'),
          actualArrival: new Date('2024-01-03')
        },
        {
          ship: ship._id,
          departure: { port: 'Port B', coordinates: [1, 1] },
          destination: { port: 'Port C', coordinates: [2, 2] },
          status: 'COMPLETED',
          distance: 1200,
          weather: {
            average: {
              windSpeed: 20,
              waveHeight: 3,
              temperature: 18
            }
          },
          estimatedDeparture: new Date('2024-01-05'),
          actualDeparture: new Date('2024-01-05'),
          actualArrival: new Date('2024-01-08')
        }
      ]);
    });

    it('should schedule maintenance based on engine hours', async () => {
      const maintenance = await MaintenanceService.scheduleMaintenance(ship._id);

      expect(maintenance).toBeDefined();
      expect(maintenance.ship.toString()).toBe(ship._id.toString());
      expect(maintenance.type).toBe('ROUTINE');
      expect(maintenance.tasks).toHaveLength(expect.any(Number));
      expect(maintenance.date).toBeInstanceOf(Date);
    });

    it('should include engine oil change when engine hours are high', async () => {
      await Ship.findByIdAndUpdate(ship._id, { engineHours: 4800 });
      const maintenance = await MaintenanceService.scheduleMaintenance(ship._id);

      const oilChangeTask = maintenance.tasks.find(task => 
        task.name === 'Engine Oil Change'
      );
      expect(oilChangeTask).toBeDefined();
    });

    it('should include weather damage inspection for high weather impact', async () => {
      // Add a route with severe weather
      await Route.create({
        ship: ship._id,
        departure: { port: 'Port C', coordinates: [2, 2] },
        destination: { port: 'Port D', coordinates: [3, 3] },
        status: 'COMPLETED',
        distance: 800,
        weather: {
          average: {
            windSpeed: 40,
            waveHeight: 8,
            temperature: 15
          }
        },
        estimatedDeparture: new Date('2024-01-10'),
        actualDeparture: new Date('2024-01-10'),
        actualArrival: new Date('2024-01-12')
      });

      const maintenance = await MaintenanceService.scheduleMaintenance(ship._id);
      const weatherInspectionTask = maintenance.tasks.find(task => 
        task.name === 'Weather Damage Inspection'
      );
      expect(weatherInspectionTask).toBeDefined();
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk score based on multiple factors', () => {
      const factors = {
        engineHours: {
          total: 4500,
          sinceLastMaintenance: 4000,
          hoursPerDay: 20
        },
        routeIntensity: {
          averageDistance: 1000,
          averageSpeed: 25,
          routesPerMonth: 8
        },
        weatherImpact: 0.7,
        lastMaintenanceAge: 150
      };

      const riskScore = MaintenanceService.calculateRiskScore(factors);
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });

    it('should handle missing factors gracefully', () => {
      const factors = {
        engineHours: {
          total: 4500,
          sinceLastMaintenance: 4000,
          hoursPerDay: 20
        },
        routeIntensity: null,
        weatherImpact: 0.7,
        lastMaintenanceAge: 150
      };

      const riskScore = MaintenanceService.calculateRiskScore(factors);
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Maintenance Cost Estimation', () => {
    it('should estimate maintenance costs based on tasks', () => {
      const tasks = [
        {
          name: 'Engine Oil Change',
          estimatedDuration: 2
        },
        {
          name: 'Hull Inspection',
          estimatedDuration: 3
        },
        {
          name: 'Safety Equipment Check',
          estimatedDuration: 2
        }
      ];

      const cost = MaintenanceService.estimateMaintenanceCost(tasks);
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should include base cost in estimation', () => {
      const tasks = [
        {
          name: 'Safety Equipment Check',
          estimatedDuration: 2
        }
      ];

      const cost = MaintenanceService.estimateMaintenanceCost(tasks);
      expect(cost).toBeGreaterThan(1000); // Base cost is 1000
    });
  });

  describe('Maintenance Status Updates', () => {
    let ship, maintenance;

    beforeEach(async () => {
      ship = await Ship.create({
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO',
        engineHours: 4500
      });

      maintenance = await Maintenance.create({
        ship: ship._id,
        type: 'ROUTINE',
        date: new Date(),
        tasks: [
          {
            name: 'Engine Inspection',
            estimatedDuration: 4,
            status: 'PENDING'
          },
          {
            name: 'Hull Inspection',
            estimatedDuration: 3,
            status: 'PENDING'
          }
        ]
      });
    });

    it('should update maintenance status and completed tasks', async () => {
      const completedTasks = [maintenance.tasks[0]._id];
      const updatedMaintenance = await MaintenanceService.updateMaintenanceStatus(
        maintenance._id,
        'IN_PROGRESS',
        completedTasks
      );

      expect(updatedMaintenance.status).toBe('IN_PROGRESS');
      expect(updatedMaintenance.tasks[0].status).toBe('COMPLETED');
      expect(updatedMaintenance.tasks[1].status).toBe('PENDING');
    });

    it('should update ship data when maintenance is completed', async () => {
      await MaintenanceService.updateMaintenanceStatus(
        maintenance._id,
        'COMPLETED',
        maintenance.tasks.map(task => task._id)
      );

      const updatedShip = await Ship.findById(ship._id);
      expect(updatedShip.lastMaintenance).toBeDefined();
      expect(updatedShip.engineHours).toBe(0); // Reset engine hours
    });
  });

  describe('Maintenance History', () => {
    let ship;

    beforeEach(async () => {
      ship = await Ship.create({
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO'
      });

      // Create maintenance history
      await Maintenance.create([
        {
          ship: ship._id,
          type: 'ROUTINE',
          status: 'COMPLETED',
          date: new Date('2024-01-01'),
          tasks: [
            {
              name: 'Engine Inspection',
              estimatedDuration: 4,
              status: 'COMPLETED'
            }
          ]
        },
        {
          ship: ship._id,
          type: 'EMERGENCY',
          status: 'COMPLETED',
          date: new Date('2024-02-01'),
          tasks: [
            {
              name: 'Emergency Repair',
              estimatedDuration: 6,
              status: 'COMPLETED'
            }
          ]
        }
      ]);
    });

    it('should retrieve maintenance history for a ship', async () => {
      const history = await MaintenanceService.getMaintenanceHistory(ship._id);
      expect(history).toHaveLength(2);
      expect(history[0].date).toBeInstanceOf(Date);
      expect(history[0].type).toBeDefined();
      expect(history[0].tasks).toBeDefined();
    });

    it('should filter maintenance history by status', async () => {
      const completedHistory = await MaintenanceService.getMaintenanceHistory(
        ship._id,
        'COMPLETED'
      );
      expect(completedHistory).toHaveLength(2);
      expect(completedHistory.every(m => m.status === 'COMPLETED')).toBe(true);
    });
  });
}); 