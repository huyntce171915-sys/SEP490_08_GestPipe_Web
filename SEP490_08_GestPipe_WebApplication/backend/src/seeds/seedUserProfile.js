const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const UserProfile = require('../models/UserProfile');

const DATA_PATH = path.resolve(__dirname, '../../../DataImport/GestPipeDb.User_Profiles.json');

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

const transformUserProfiles = (profiles) => {
  return profiles.map(profile => {
    // Convert gender to lowercase and set default if not present
    if (profile.gender) {
      profile.gender = profile.gender.toLowerCase();
    } else {
      profile.gender = 'other'; // Default value
    }
    return profile;
  });
};

const seedUserProfiles = async () => {
  console.log('[seedUserProfile] Starting seed...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[seedUserProfile] File not found: ${DATA_PATH}`);
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const count = await UserProfile.countDocuments();
    if (count > 0) {
      console.log(`[seedUserProfile] Collection already has ${count} documents, skipping...`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    const rawData = JSON.parse(fileContent);
    
    let data = Array.isArray(rawData) ? rawData.map(item => parseMongoJSON(item)) : [parseMongoJSON(rawData)];
    
    // Transform data to fix gender values
    data = transformUserProfiles(data);

    console.log(`[seedUserProfile] Parsed ${data.length} user profiles`);

    await UserProfile.insertMany(data);
    console.log(`[seedUserProfile] ✓ Successfully imported ${data.length} user profiles`);

  } catch (err) {
    console.error('[seedUserProfile] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
};

seedUserProfiles();
