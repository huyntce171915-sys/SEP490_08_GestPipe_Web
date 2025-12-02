require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const GestureType = require('../models/GestureType');

const seedGestureTypes = async () => {
  try {
    await connectDB();

    // Clear existing data
    await GestureType.deleteMany({});

    // Insert gesture types
    const gestureTypes = [
      { name: 'static', description: 'Static gestures with minimal movement' },
      { name: 'dynamic', description: 'Dynamic gestures with significant movement' }
    ];

    await GestureType.insertMany(gestureTypes);
    console.log('✅ Gesture types seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding gesture types:', error);
    process.exit(1);
  }
};

seedGestureTypes();