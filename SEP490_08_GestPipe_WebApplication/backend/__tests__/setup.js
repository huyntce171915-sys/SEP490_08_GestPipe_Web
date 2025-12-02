// __tests__/setup.js
require('dotenv').config();
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gestpipe-test';

// Suppress mongoose warnings in tests
mongoose.set('strictQuery', false);

// Global test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
});
