const GestureSample = require('../models/GestureSample');
const GestureType = require('../models/GestureType');
const path = require('path');
const { PythonShell } = require('python-shell');
const { PYTHON_BIN } = require('../utils/pythonRunner');

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

exports.listSamples = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 25), 200);
    const poseLabel = req.query.poseLabel;
    const gestureType = req.query.gestureType;

    const filter = {};
    if (poseLabel) {
      filter.pose_label = poseLabel;
    }
    if (gestureType) {
      filter.gesture_type = gestureType;
    }

    const [items, total] = await Promise.all([
      GestureSample.find(filter)
        .sort({ pose_label: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GestureSample.countDocuments(filter),
    ]);

    // Transform data to match expected format for frontend
    const transformedItems = items.map(item => ({
      ...item,
      instance_id: item._id.toString(),
      // GestureSample already has gesture_type field, no need to populate
      gesture_type: item.gesture_type || 'static',
    }));

    console.log('🔍 Gestures in DB:', total, transformedItems.map(i => i.pose_label));
    console.log('🔍 Items returned:', transformedItems.length);

    res.json({
      data: transformedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('[gestureController.listSamples] Error:', error);
    res.status(500).json({ message: 'Failed to fetch gesture samples' });
  }
};

exports.listLabels = async (_req, res) => {
  try {
    const labels = await GestureSample.distinct('pose_label');
    res.json(labels);
  } catch (error) {
    console.error('[gestureController.listLabels] Error:', error);
    res.status(500).json({ message: 'Failed to fetch pose labels' });
  }
};

exports.stats = async (_req, res) => {
  try {
    const counts = await GestureSample.aggregate([
      {
        $group: {
          _id: '$pose_label',
          samples: { $sum: 1 },
        },
      },
      { $sort: { samples: -1 } },
    ]);

    const totalGestures = await GestureSample.countDocuments();
    const typeBreakdown = await GestureSample.aggregate([
      {
        $group: {
          _id: '$gesture_type',
          samples: { $sum: 1 },
        },
      },
    ]);

    // Calculate motion center from GestureSample data
    const motionCenter = await GestureSample.aggregate([
      {
        $group: {
          _id: null,
          deltaXAvg: { $avg: '$delta_x' },
          deltaYAvg: { $avg: '$delta_y' },
        },
      },
    ]);

    res.json({
      counts: counts.map((row) => ({
        pose_label: row._id,
        samples: row.samples,
      })),
      types: typeBreakdown.reduce(
        (acc, row) => {
          if (row._id === 'static') {
            acc.static = row.samples;
          } else if (row._id === 'dynamic') {
            acc.dynamic = row.samples;
          }
          return acc;
        },
        { static: 0, dynamic: 0 }
      ),
      motionCenter: motionCenter[0] || { deltaXAvg: 0, deltaYAvg: 0 },
    });
  } catch (error) {
    console.error('[gestureController.stats] Error:', error);
    res.status(500).json({ message: 'Failed to compute gesture statistics' });
  }
};

exports.customizeGesture = async (req, res) => {
  return res.status(410).json({
    message: 'Legacy customization flow không còn hỗ trợ. Vui lòng sử dụng endpoint /api/gestures/customize/upload.',
  });
};

exports.predictGesture = async (req, res) => {
  try {
    const { left_fingers, right_fingers, motion_features, target_gesture, duration } = req.body;

    if (!left_fingers || !right_fingers || !motion_features || !target_gesture) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('🎯 Evaluating gesture:', target_gesture);
    console.log('📏 Left fingers:', left_fingers);
    console.log('📏 Right fingers:', right_fingers);
    console.log('📊 Motion features:', motion_features);

    // Prepare data for Python script
    const inputData = {
      left_fingers,
      right_fingers,
      motion_features,
      target_gesture,
      duration: duration || 1.0
    };

    // Path to Python script
    const scriptPath = path.resolve(__dirname, '../utils/gesture_prediction.py');
    console.log('🔍 Script path:', scriptPath);
    console.log('🔍 File exists:', require('fs').existsSync(scriptPath));

    // Run Python script
    const results = await new Promise((resolve, reject) => {
      const pyshell = new PythonShell(scriptPath, {
        mode: 'json',
        pythonPath: PYTHON_BIN,
        pythonOptions: ['-u'],
      });

      pyshell.send(inputData);

      pyshell.on('message', (message) => {
        resolve(message);
      });

      pyshell.on('error', (error) => {
        reject(error);
      });

      pyshell.end((err) => {
        if (err) reject(err);
      });
    });

    console.log('✅ Evaluation result:', results);
    res.json(results);
  } catch (error) {
    console.error('[gestureController.predictGesture] Error:', error);
    res.status(500).json({ message: 'Prediction failed', error: error.message });
  }
};

exports.getGestureTemplates = async (req, res) => {
  try {
    // Aggregate gesture samples to create templates
    const templates = await GestureSample.aggregate([
      {
        $group: {
          _id: '$pose_label',
          gesture_type: { $first: '$gesture_type' },
          left_finger_0: { $first: '$left_finger_state_0' },
          left_finger_1: { $first: '$left_finger_state_1' },
          left_finger_2: { $first: '$left_finger_state_2' },
          left_finger_3: { $first: '$left_finger_state_3' },
          left_finger_4: { $first: '$left_finger_state_4' },
          right_finger_0: { $first: '$right_finger_state_0' },
          right_finger_1: { $first: '$right_finger_state_1' },
          right_finger_2: { $first: '$right_finger_state_2' },
          right_finger_3: { $first: '$right_finger_state_3' },
          right_finger_4: { $first: '$right_finger_state_4' },
          main_axis_x: { $first: '$main_axis_x' },
          main_axis_y: { $first: '$main_axis_y' },
          delta_x: { $first: '$delta_x' },
          delta_y: { $first: '$delta_y' },
          avg_accuracy: { $avg: '$accuracy' },
          sample_count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          pose_label: '$_id',
          gesture_type: 1,
          left_fingers: [
            '$left_finger_0',
            '$left_finger_1',
            '$left_finger_2',
            '$left_finger_3',
            '$left_finger_4'
          ],
          right_fingers: [
            '$right_finger_0',
            '$right_finger_1',
            '$right_finger_2',
            '$right_finger_3',
            '$right_finger_4'
          ],
          main_axis_x: 1,
          main_axis_y: 1,
          delta_x: 1,
          delta_y: 1,
          is_static: {
            $and: [
              { $lt: [{ $abs: '$delta_x' }, 0.02] },
              { $lt: [{ $abs: '$delta_y' }, 0.02] }
            ]
          },
          avg_accuracy: 1,
          sample_count: 1
        }
      },
      {
        $sort: { pose_label: 1 }
      }
    ]);

    // Convert to template format
    const templateMap = {};
    templates.forEach(template => {
      templateMap[template.pose_label] = {
        left_fingers: template.left_fingers,
        right_fingers: template.right_fingers,
        main_axis_x: template.main_axis_x,
        main_axis_y: template.main_axis_y,
        delta_x: template.delta_x,
        delta_y: template.delta_y,
        is_static: template.is_static,
        description: `${template.pose_label} - ${template.gesture_type} gesture (${template.sample_count} samples, ${Math.round(template.avg_accuracy * 100)}% accuracy)`
      };
    });

    console.log(`📋 Loaded ${templates.length} gesture templates from database`);
    res.json(templateMap);
  } catch (error) {
    console.error('[gestureController.getGestureTemplates] Error:', error);
    res.status(500).json({ message: 'Failed to fetch gesture templates' });
  }
};
