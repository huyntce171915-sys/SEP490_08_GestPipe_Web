const fs = require('fs');
const { format } = require('@fast-csv/format');
const GestureSample = require('../models/GestureSample');

const CSV_HEADERS = [
  'instance_id',
  'pose_label',
  'gesture_type',
  'left_finger_state_0',
  'left_finger_state_1',
  'left_finger_state_2',
  'left_finger_state_3',
  'left_finger_state_4',
  'right_finger_state_0',
  'right_finger_state_1',
  'right_finger_state_2',
  'right_finger_state_3',
  'right_finger_state_4',
  'motion_x_start',
  'motion_y_start',
  'motion_x_mid',
  'motion_y_mid',
  'motion_x_end',
  'motion_y_end',
  'main_axis_x',
  'main_axis_y',
  'delta_x',
  'delta_y',
];

const exportGesturesToCsv = async (outputPath) =>
  new Promise((resolve, reject) => {
    const writableStream = fs.createWriteStream(outputPath);
    const csvStream = format({ headers: CSV_HEADERS });

    writableStream.on('finish', resolve);
    writableStream.on('error', reject);
    csvStream.on('error', reject);

    csvStream.pipe(writableStream);

    const cursor = GestureSample.find().cursor();
    cursor
      .on('data', (doc) => {
        csvStream.write({
          instance_id: doc.instance_id,
          pose_label: doc.pose_label,
          gesture_type: doc.gesture_type,
          left_finger_state_0: doc.left_finger_state_0,
          left_finger_state_1: doc.left_finger_state_1,
          left_finger_state_2: doc.left_finger_state_2,
          left_finger_state_3: doc.left_finger_state_3,
          left_finger_state_4: doc.left_finger_state_4,
          right_finger_state_0: doc.right_finger_state_0,
          right_finger_state_1: doc.right_finger_state_1,
          right_finger_state_2: doc.right_finger_state_2,
          right_finger_state_3: doc.right_finger_state_3,
          right_finger_state_4: doc.right_finger_state_4,
          motion_x_start: doc.motion_x_start,
          motion_y_start: doc.motion_y_start,
          motion_x_mid: doc.motion_x_mid,
          motion_y_mid: doc.motion_y_mid,
          motion_x_end: doc.motion_x_end,
          motion_y_end: doc.motion_y_end,
          main_axis_x: doc.main_axis_x,
          main_axis_y: doc.main_axis_y,
          delta_x: doc.delta_x,
          delta_y: doc.delta_y,
        });
      })
      .on('end', () => {
        csvStream.end();
      })
      .on('error', reject);
  });

module.exports = exportGesturesToCsv;
