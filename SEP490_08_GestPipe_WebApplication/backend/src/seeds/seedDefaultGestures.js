const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const DefaultGesture = require('../models/DefaultGestures.js');

const DATA_PATH = path.resolve(__dirname, '../../../DataImport/GestPipeDb.DefaultGestures.json');

const parseMongoJSON = (data) => {
  if (typeof data === 'object' && data !== null) {
    // Handle MongoDB ObjectId format
    if (data.$oid) {
      return new mongoose.Types.ObjectId(data.$oid);
    }
    // Handle MongoDB Date format
    if (data.$date) {
      return new Date(data.$date);
    }
    // Handle $numberDouble
    if (data.$numberDouble) {
      return parseFloat(data.$numberDouble);
    }
    // Recursively process objects and arrays
    if (Array.isArray(data)) {
      return data.map(item => parseMongoJSON(item));
    }
    const parsed = {};
    for (const [key, value] of Object.entries(data)) {
      parsed[key] = parseMongoJSON(value);
    }
    return parsed;
  }
  return data;
};

(async () => {
  console.log('[seedDefaultGestures] Starting seed...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[seedDefaultGestures] File not found: ${DATA_PATH}`);
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    const rawData = JSON.parse(fileContent);
    
    // Parse MongoDB JSON format
    const data = Array.isArray(rawData) ? rawData.map(item => parseMongoJSON(item)) : [parseMongoJSON(rawData)];

    console.log(`[seedDefaultGestures] Parsed ${data.length} default gestures`);

    // Check if collection already has data
    const count = await DefaultGesture.countDocuments();
    if (count > 0) {
      console.log(`[seedDefaultGestures] Collection already has ${count} documents`);
      console.log('[seedDefaultGestures] Skipping import. Use "node backend/src/seeds/seedDefaultGestures.js --reset" to reset.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Insert data
    await DefaultGesture.insertMany(data);
    console.log(`[seedDefaultGestures] ✓ Successfully imported ${data.length} default gestures`);

  } catch (err) {
    console.error('[seedDefaultGestures] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
})();
