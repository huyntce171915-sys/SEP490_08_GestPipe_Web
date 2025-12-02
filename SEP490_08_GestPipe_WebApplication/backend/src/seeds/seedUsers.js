const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');

const DATA_PATH = path.resolve(__dirname, '../../../DataImport/GestPipeDb.User.json');

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
    if (data.$numberLong) {
      return parseInt(data.$numberLong);
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

const seedUsers = async () => {
  console.log('[seedUsers] Starting seed...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[seedUsers] File not found: ${DATA_PATH}`);
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const count = await User.countDocuments();
    if (count > 0) {
      console.log(`[seedUsers] Collection already has ${count} documents, skipping...`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    const rawData = JSON.parse(fileContent);
    
    let data = Array.isArray(rawData) ? rawData.map(item => parseMongoJSON(item)) : [parseMongoJSON(rawData)];
    
    // Filter out users with empty or missing password_hash
    data = data.filter(user => user.password_hash && user.password_hash.trim() !== '');
    
    console.log(`[seedUsers] Parsed ${data.length} users (filtered out users with empty password)`);

    await User.insertMany(data);
    console.log(`[seedUsers] ✓ Successfully imported ${data.length} users`);

  } catch (err) {
    console.error('[seedUsers] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
};

seedUsers();
