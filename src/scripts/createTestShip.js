const mongoose = require('mongoose');
const Ship = require('../models/Ship');
require('dotenv').config();

async function createTestShip() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testShip = new Ship({
      name: 'Test Cargo Ship ' + Date.now(),
      type: 'CARGO',
      capacity: 5000,
      fuelType: 'HFO',
      currentLocation: {
        coordinates: [0, 0]
      },
      status: 'ACTIVE',
      routes: []
    });

    await testShip.save();
    console.log('Test ship created with ID:', testShip._id);
    process.exit(0);
  } catch (error) {
    console.error('Error creating test ship:', error);
    process.exit(1);
  }
}

createTestShip(); 