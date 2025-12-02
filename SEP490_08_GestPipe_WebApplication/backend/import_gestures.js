require('dotenv').config();
const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const connectDB = require('./src/config/db');
const GestureSample = require('./src/models/GestureSample');

async function importGestureData() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Clear existing data
    await GestureSample.deleteMany({});
    console.log('Cleared existing gesture samples');

    const csvPath = path.resolve(__dirname, '../../hybrid_realtime_pipeline/code/training_results/gesture_data_compact.csv');
    console.log('Importing from:', csvPath);

    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      process.exit(1);
    }

    const samples = [];

    // Read CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          samples.push({
            instance_id: parseInt(row.instance_id),
            pose_label: row.pose_label,
            gesture_type: (row.pose_label === 'home' || row.pose_label === 'end') ? 'static' : 'dynamic',
            left_finger_state_0: parseInt(row.left_finger_state_0),
            left_finger_state_1: parseInt(row.left_finger_state_1),
            left_finger_state_2: parseInt(row.left_finger_state_2),
            left_finger_state_3: parseInt(row.left_finger_state_3),
            left_finger_state_4: parseInt(row.left_finger_state_4),
            right_finger_state_0: parseInt(row.right_finger_state_0),
            right_finger_state_1: parseInt(row.right_finger_state_1),
            right_finger_state_2: parseInt(row.right_finger_state_2),
            right_finger_state_3: parseInt(row.right_finger_state_3),
            right_finger_state_4: parseInt(row.right_finger_state_4),
            motion_x_start: parseFloat(row.motion_x_start),
            motion_y_start: parseFloat(row.motion_y_start),
            motion_x_mid: parseFloat(row.motion_x_mid),
            motion_y_mid: parseFloat(row.motion_y_mid),
            motion_x_end: parseFloat(row.motion_x_end),
            motion_y_end: parseFloat(row.motion_y_end),
            main_axis_x: parseFloat(row.main_axis_x),
            main_axis_y: parseFloat(row.main_axis_y),
            delta_x: parseFloat(row.delta_x),
            delta_y: parseFloat(row.delta_y)
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert data
    await GestureSample.insertMany(samples);
    console.log(`✅ Imported ${samples.length} gesture samples`);

    // Test getGestureTemplates
    const templates = {};
    const groupedSamples = {};
    samples.forEach(sample => {
      if (!groupedSamples[sample.pose_label]) {
        groupedSamples[sample.pose_label] = sample;
      }
    });

    Object.values(groupedSamples).forEach(sample => {
      templates[sample.pose_label] = {
        left_fingers: [
          sample.left_finger_state_0,
          sample.left_finger_state_1,
          sample.left_finger_state_2,
          sample.left_finger_state_3,
          sample.left_finger_state_4
        ],
        right_fingers: [
          sample.right_finger_state_0,
          sample.right_finger_state_1,
          sample.right_finger_state_2,
          sample.right_finger_state_3,
          sample.right_finger_state_4
        ],
        main_axis_x: sample.main_axis_x,
        main_axis_y: sample.main_axis_y,
        delta_x: sample.delta_x,
        delta_y: sample.delta_y,
        is_static: sample.gesture_type === 'static' ||
                  (Math.abs(sample.delta_x) < 0.02 && Math.abs(sample.delta_y) < 0.02),
        description: `${sample.pose_label.replace('_', ' ')} gesture`
      };
    });

    console.log('Available gesture templates:');
    Object.entries(templates).forEach(([name, template]) => {
      console.log(`${name}: static=${template.is_static}, fingers=${JSON.stringify(template.right_fingers)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importGestureData();