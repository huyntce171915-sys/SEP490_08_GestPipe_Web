const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Topic = require('../models/Topic');

const DATA_PATH = path.resolve(__dirname, '../../../DataImport/GestPipeDb.Topic.json');

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
  console.log('[seedTopic] Starting seed...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[seedTopic] File not found: ${DATA_PATH}`);
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const count = await Topic.countDocuments();
    if (count > 0) {
      console.log(`[seedTopic] Collection already has ${count} documents, skipping...`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    const rawData = JSON.parse(fileContent);
    
    const data = Array.isArray(rawData) ? rawData.map(item => parseMongoJSON(item)) : [parseMongoJSON(rawData)];

    console.log(`[seedTopic] Parsed ${data.length} topics`);

    await Topic.insertMany(data);
    console.log(`[seedTopic] ✓ Successfully imported ${data.length} topics`);

  } catch (err) {
    console.error('[seedTopic] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
})();
