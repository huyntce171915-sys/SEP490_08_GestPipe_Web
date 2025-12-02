const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const UserGestureConfig = require('../models/UserGestureConfigs');

const DATA_PATH = path.resolve(__dirname, '../../../DataImport/GestPipeDb.UserGestureConfigs.json');

const parseMongoJSON = (data) => {
  if (typeof data === 'object' && data !== null) {
    if (data.$oid) {
      return new mongoose.Types.ObjectId(data.$oid);
    }
    if (data.$date) {
      return new Date(data.$date);
    }
    if (data.$numberDouble) {
      return parseFloat(data.$numberDouble);
    }
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
  console.log('[seedUserGestureConfigs] Starting seed...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[seedUserGestureConfigs] File not found: ${DATA_PATH}`);
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const count = await UserGestureConfig.countDocuments();
    if (count > 0) {
      console.log(`[seedUserGestureConfigs] Collection already has ${count} documents, skipping...`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    const rawData = JSON.parse(fileContent);
    
    const data = Array.isArray(rawData) ? rawData.map(item => parseMongoJSON(item)) : [parseMongoJSON(rawData)];

    console.log(`[seedUserGestureConfigs] Parsed ${data.length} user gesture configs`);

    await UserGestureConfig.insertMany(data);
    console.log(`[seedUserGestureConfigs] ✓ Successfully imported ${data.length} user gesture configs`);

  } catch (err) {
    console.error('[seedUserGestureConfigs] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
})();
