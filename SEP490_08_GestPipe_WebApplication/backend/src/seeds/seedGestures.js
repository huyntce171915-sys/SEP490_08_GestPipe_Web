require('dotenv').config();
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const GestureSample = require('../models/GestureSample');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../../hybrid_realtime_pipeline/code/training_results/gesture_data_compact.csv'
);

const readCsv = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (raw) => {
        const deltaX = Number(raw.delta_x);
        const deltaY = Number(raw.delta_y);
        const gestureType =
          Math.abs(deltaX) <= 0.02 && Math.abs(deltaY) <= 0.02
            ? 'static'
            : 'dynamic';
        rows.push({
          pose_label: raw.pose_label,
          gesture_type: gestureType,
          left_finger_state_0: Number(raw.left_finger_state_0),
          left_finger_state_1: Number(raw.left_finger_state_1),
          left_finger_state_2: Number(raw.left_finger_state_2),
          left_finger_state_3: Number(raw.left_finger_state_3),
          left_finger_state_4: Number(raw.left_finger_state_4),
          right_finger_state_0: Number(raw.right_finger_state_0),
          right_finger_state_1: Number(raw.right_finger_state_1),
          right_finger_state_2: Number(raw.right_finger_state_2),
          right_finger_state_3: Number(raw.right_finger_state_3),
          right_finger_state_4: Number(raw.right_finger_state_4),
          main_axis_x: Number(raw.main_axis_x),
          main_axis_y: Number(raw.main_axis_y),
          delta_x: Number(raw.delta_x),
          delta_y: Number(raw.delta_y),
          accuracy: 0.95,
        });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

(async () => {
  const csvPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_CSV_PATH;

  console.log(`[seedGestures] Loading CSV from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('[seedGestures] CSV file not found. Double-check the path.');
    process.exit(1);
  }

  await connectDB();

  let exitCode = 0;

  try {
    const rows = await readCsv(csvPath);
    console.log(`[seedGestures] Parsed ${rows.length} rows`);

    if (!rows.length) {
      throw new Error('CSV appears to be empty');
    }

    await GestureSample.deleteMany({});
    await GestureSample.insertMany(rows);

    console.log(`[seedGestures] Imported ${rows.length} gesture samples`);
  } catch (err) {
    console.error('[seedGestures] Failed:', err);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
})();
