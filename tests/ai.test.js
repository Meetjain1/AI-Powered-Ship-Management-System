const RouteOptimizer = require('../src/services/ai/RouteOptimizer');
const tf = require('@tensorflow/tfjs-node');

describe('Route Optimizer AI Service', () => {
  let routeOptimizer;

  beforeEach(async () => {
    routeOptimizer = new RouteOptimizer();
    await routeOptimizer.initialize();
  });

  describe('Model Training', () => {
    it('should train the model with sample data', async () => {
      const trainingData = [
        {
          distance: 1000,
          cargoWeight: 3000,
          weather: {
            windSpeed: 10,
            waveHeight: 2,
            temperature: 20
          },
          shipType: 'CARGO',
          fuelType: 'HFO',
          date: new Date('2024-01-01'),
          actualDuration: 48,
          actualFuelConsumption: 5000
        },
        {
          distance: 1500,
          cargoWeight: 4000,
          weather: {
            windSpeed: 15,
            waveHeight: 3,
            temperature: 18
          },
          shipType: 'CARGO',
          fuelType: 'HFO',
          date: new Date('2024-01-02'),
          actualDuration: 72,
          actualFuelConsumption: 8000
        }
      ];

      const initialLoss = await routeOptimizer.train(trainingData);
      expect(initialLoss).toBeDefined();
      expect(typeof initialLoss).toBe('number');
    });

    it('should handle empty training data', async () => {
      await expect(routeOptimizer.train([])).rejects.toThrow();
    });
  });

  describe('Predictions', () => {
    it('should make route predictions', async () => {
      const input = {
        distance: 1200,
        cargoWeight: 3500,
        weather: {
          windSpeed: 12,
          waveHeight: 2.5,
          temperature: 19
        },
        shipType: 'CARGO',
        fuelType: 'HFO',
        date: new Date('2024-01-03')
      };

      const prediction = await routeOptimizer.predict(input);
      
      expect(prediction).toHaveProperty('estimatedDuration');
      expect(prediction).toHaveProperty('estimatedFuelConsumption');
      expect(typeof prediction.estimatedDuration).toBe('number');
      expect(typeof prediction.estimatedFuelConsumption).toBe('number');
      expect(prediction.estimatedDuration).toBeGreaterThan(0);
      expect(prediction.estimatedFuelConsumption).toBeGreaterThan(0);
    });

    it('should handle invalid input data', async () => {
      const invalidInput = {
        distance: -1000, // Invalid negative distance
        cargoWeight: 3500,
        weather: {
          windSpeed: 12,
          waveHeight: 2.5,
          temperature: 19
        },
        shipType: 'CARGO',
        fuelType: 'HFO',
        date: new Date('2024-01-03')
      };

      await expect(routeOptimizer.predict(invalidInput)).rejects.toThrow();
    });
  });

  describe('Feature Engineering', () => {
    it('should process weather features correctly', () => {
      const weather = {
        windSpeed: 15,
        waveHeight: 3,
        temperature: 20
      };

      const features = routeOptimizer.processWeatherFeatures(weather);
      expect(features).toHaveLength(3);
      expect(features[0]).toBe(15 / 50); // Normalized wind speed
      expect(features[1]).toBe(3 / 10);  // Normalized wave height
      expect(features[2]).toBe(20 / 40); // Normalized temperature
    });

    it('should process categorical features correctly', () => {
      const shipType = 'CARGO';
      const fuelType = 'HFO';

      const shipTypeEncoding = routeOptimizer.encodeShipType(shipType);
      const fuelTypeEncoding = routeOptimizer.encodeFuelType(fuelType);

      expect(shipTypeEncoding).toHaveLength(4); // One-hot encoding for ship types
      expect(fuelTypeEncoding).toHaveLength(3); // One-hot encoding for fuel types
      expect(shipTypeEncoding.includes(1)).toBe(true);
      expect(fuelTypeEncoding.includes(1)).toBe(true);
    });

    it('should handle seasonality features', () => {
      const date = new Date('2024-01-01');
      const seasonality = routeOptimizer.extractSeasonality(date);

      expect(seasonality).toHaveLength(2);
      expect(seasonality.every(v => v >= -1 && v <= 1)).toBe(true);
    });
  });

  describe('Model Architecture', () => {
    it('should have the correct input shape', () => {
      const inputLayer = routeOptimizer.model.layers[0];
      expect(inputLayer.inputShape[1]).toBe(8); // Total number of features
    });

    it('should have multiple dense layers', () => {
      const layers = routeOptimizer.model.layers;
      expect(layers.length).toBeGreaterThan(2);
      expect(layers.every(layer => layer instanceof tf.layers.Dense)).toBe(true);
    });

    it('should output two values', () => {
      const outputLayer = routeOptimizer.model.layers[routeOptimizer.model.layers.length - 1];
      expect(outputLayer.units).toBe(2); // Duration and fuel consumption
    });
  });

  describe('Model Persistence', () => {
    it('should save and load model weights', async () => {
      // Train the model with some data
      await routeOptimizer.train([{
        distance: 1000,
        cargoWeight: 3000,
        weather: {
          windSpeed: 10,
          waveHeight: 2,
          temperature: 20
        },
        shipType: 'CARGO',
        fuelType: 'HFO',
        date: new Date('2024-01-01'),
        actualDuration: 48,
        actualFuelConsumption: 5000
      }]);

      // Save the model
      const savedWeights = await routeOptimizer.model.getWeights();
      
      // Create a new instance and load weights
      const newOptimizer = new RouteOptimizer();
      await newOptimizer.initialize();
      await newOptimizer.model.setWeights(savedWeights);

      // Make predictions with both models
      const input = {
        distance: 1200,
        cargoWeight: 3500,
        weather: {
          windSpeed: 12,
          waveHeight: 2.5,
          temperature: 19
        },
        shipType: 'CARGO',
        fuelType: 'HFO',
        date: new Date('2024-01-03')
      };

      const prediction1 = await routeOptimizer.predict(input);
      const prediction2 = await newOptimizer.predict(input);

      // Compare predictions
      expect(prediction1.estimatedDuration).toBeCloseTo(prediction2.estimatedDuration, 5);
      expect(prediction1.estimatedFuelConsumption).toBeCloseTo(prediction2.estimatedFuelConsumption, 5);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing weather data', async () => {
      const input = {
        distance: 1200,
        cargoWeight: 3500,
        weather: null,
        shipType: 'CARGO',
        fuelType: 'HFO',
        date: new Date('2024-01-03')
      };

      await expect(routeOptimizer.predict(input)).rejects.toThrow();
    });

    it('should handle invalid ship type', async () => {
      const input = {
        distance: 1200,
        cargoWeight: 3500,
        weather: {
          windSpeed: 12,
          waveHeight: 2.5,
          temperature: 19
        },
        shipType: 'INVALID_TYPE',
        fuelType: 'HFO',
        date: new Date('2024-01-03')
      };

      await expect(routeOptimizer.predict(input)).rejects.toThrow();
    });

    it('should handle NaN values in training data', async () => {
      const trainingData = [{
        distance: NaN,
        cargoWeight: 3000,
        weather: {
          windSpeed: 10,
          waveHeight: 2,
          temperature: 20
        },
        shipType: 'CARGO',
        fuelType: 'HFO',
        date: new Date('2024-01-01'),
        actualDuration: 48,
        actualFuelConsumption: 5000
      }];

      await expect(routeOptimizer.train(trainingData)).rejects.toThrow();
    });
  });
}); 