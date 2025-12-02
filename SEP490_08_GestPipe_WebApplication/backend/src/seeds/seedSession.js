const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Session = require('../models/Session');

const DATA_PATH = path.resolve(__dirname, '../../../DataImport/GestPipeDb.Session.json');

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

const transformSessions = (sessions) => {
  return sessions
    .filter(session => session.user_id && session.category_id && session.topic_id)
    .map(session => {
      // Ensure records is an object, not a number
      if (typeof session.records === 'number') {
        session.records = { accuracy: session.records };
      }
      return session;
    });
};

const seedSessions = async () => {
  console.log('[seedSession] Starting seed...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[seedSession] File not found: ${DATA_PATH}`);
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const count = await Session.countDocuments();
    if (count > 0) {
      console.log(`[seedSession] Collection already has ${count} documents, skipping...`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    const rawData = JSON.parse(fileContent);
    
    let data = Array.isArray(rawData) ? rawData.map(item => parseMongoJSON(item)) : [parseMongoJSON(rawData)];
    
    // Transform data to ensure records is an object
    data = transformSessions(data);

    console.log(`[seedSession] Parsed ${data.length} sessions`);

    await Session.insertMany(data);
    console.log(`[seedSession] ✓ Successfully imported ${data.length} sessions`);

  } catch (err) {
    console.error('[seedSession] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
};

seedSessions();
