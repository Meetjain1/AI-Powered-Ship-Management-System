const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/index');
const Ship = require('../src/models/Ship');
const Route = require('../src/models/Route');
const Maintenance = require('../src/models/Maintenance');

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

describe('Ship Management API', () => {
  describe('POST /api/v1/ships', () => {
    it('should create a new ship', async () => {
      const shipData = {
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO'
      };

      const response = await request(app)
        .post('/api/v1/ships')
        .send(shipData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(shipData.name);
      expect(response.body.type).toBe(shipData.type);
      expect(response.body.capacity).toBe(shipData.capacity);
      expect(response.body.fuelType).toBe(shipData.fuelType);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/ships')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/v1/ships', () => {
    beforeEach(async () => {
      await Ship.create([
        {
          name: 'Ship 1',
          type: 'CARGO',
          capacity: 5000,
          fuelType: 'HFO'
        },
        {
          name: 'Ship 2',
          type: 'TANKER',
          capacity: 8000,
          fuelType: 'MGO'
        }
      ]);
    });

    it('should list all ships', async () => {
      const response = await request(app)
        .get('/api/v1/ships')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[1]).toHaveProperty('name');
    });

    it('should filter ships by type', async () => {
      const response = await request(app)
        .get('/api/v1/ships')
        .query({ type: 'CARGO' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('CARGO');
    });
  });

  describe('POST /api/v1/route-plan', () => {
    let ship;

    beforeEach(async () => {
      ship = await Ship.create({
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO'
      });
    });

    it('should create a new route plan', async () => {
      const routeData = {
        shipId: ship._id,
        departure: {
          port: 'Port A',
          coordinates: [0, 0]
        },
        destination: {
          port: 'Port B',
          coordinates: [1, 1]
        },
        estimatedDeparture: new Date().toISOString(),
        cargoWeight: 3000
      };

      const response = await request(app)
        .post('/api/v1/route-plan')
        .send(routeData)
        .expect(201);

      expect(response.body).toHaveProperty('route');
      expect(response.body).toHaveProperty('predictions');
      expect(response.body.route.ship.toString()).toBe(ship._id.toString());
    });

    it('should validate route data', async () => {
      const response = await request(app)
        .post('/api/v1/route-plan')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/v1/maintenance/schedule', () => {
    let ship;

    beforeEach(async () => {
      ship = await Ship.create({
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO',
        engineHours: 4900
      });
    });

    it('should schedule maintenance', async () => {
      const response = await request(app)
        .post('/api/v1/maintenance/schedule')
        .send({ shipId: ship._id })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('tasks');
      expect(response.body.ship.toString()).toBe(ship._id.toString());
      expect(response.body.type).toBe('ROUTINE');
    });

    it('should handle invalid ship ID', async () => {
      const response = await request(app)
        .post('/api/v1/maintenance/schedule')
        .send({ shipId: 'invalid-id' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/v1/analytics/performance-metrics', () => {
    let ship;

    beforeEach(async () => {
      ship = await Ship.create({
        name: 'Test Ship',
        type: 'CARGO',
        capacity: 5000,
        fuelType: 'HFO'
      });

      // Create some test routes
      await Route.create({
        ship: ship._id,
        departure: {
          port: 'Port A',
          coordinates: [0, 0]
        },
        destination: {
          port: 'Port B',
          coordinates: [1, 1]
        },
        status: 'COMPLETED',
        distance: 100,
        fuelConsumption: {
          estimated: 1000,
          actual: 950
        },
        estimatedDeparture: new Date('2024-01-01'),
        estimatedArrival: new Date('2024-01-02'),
        actualDeparture: new Date('2024-01-01'),
        actualArrival: new Date('2024-01-02')
      });
    });

    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/performance-metrics')
        .query({ shipId: ship._id })
        .expect(200);

      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('routeEfficiency');
      expect(response.body).toHaveProperty('fuelEfficiency');
      expect(response.body).toHaveProperty('maintenanceHealth');
    });

    it('should handle invalid ship ID', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/performance-metrics')
        .query({ shipId: 'invalid-id' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
}); 