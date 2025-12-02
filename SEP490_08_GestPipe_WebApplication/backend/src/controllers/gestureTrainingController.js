const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const GestureSample = require('../models/GestureSample');
const GestureTrainingRun = require('../models/GestureTrainingRun');
const exportGesturesToCsv = require('../utils/exportGesturesToCsv');
const parseTrainingSummary = require('../utils/parseTrainingSummary');

let activeProcess = null;
let activeRunId = null;
let cancellationRequested = false;

const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const PIPELINE_ROOT =
  process.env.PIPELINE_ROOT ||
  path.resolve(__dirname, '../../../hybrid_realtime_pipeline');
// Use original training script
const TRAIN_SCRIPT = path.join(PIPELINE_ROOT, 'train_motion_svm_all_models.py');
const RESULTS_DIR = path.join(PIPELINE_ROOT, 'training_results');
const MODELS_DIR = path.join(PIPELINE_ROOT, 'models');

const ARTIFACTS = {
  model: path.join(MODELS_DIR, 'motion_svm_model.pkl'),
  scaler: path.join(MODELS_DIR, 'motion_scaler.pkl'),
  staticDynamicClassifier: path.join(
    MODELS_DIR,
    'static_dynamic_classifier.pkl'
  ),
  summaryCsv: path.join(RESULTS_DIR, 'optimal_hyperparameters_per_pose.csv'),
};

const appendLog = async (runId, level, message) => {
  await GestureTrainingRun.findByIdAndUpdate(runId, {
    $push: {
      log: {
        level,
        message: message.toString(),
      },
    },
  });
};

// Check if pre-trained models exist
const checkExistingModels = async () => {
  try {
    const modelChecks = await Promise.all([
      fs.access(ARTIFACTS.model).then(() => true).catch(() => false),
      fs.access(ARTIFACTS.scaler).then(() => true).catch(() => false),
      fs.access(ARTIFACTS.staticDynamicClassifier).then(() => true).catch(() => false),
    ]);

    const [hasModel, hasScaler, hasClassifier] = modelChecks;
    const allModelsExist = hasModel && hasScaler && hasClassifier;

    let modelInfo = null;
    if (allModelsExist) {
      const modelStat = await fs.stat(ARTIFACTS.model);
      modelInfo = {
        exists: true,
        lastModified: modelStat.mtime,
        size: modelStat.size,
        files: {
          model: hasModel,
          scaler: hasScaler, 
          classifier: hasClassifier
        }
      };
    }

    return { allModelsExist, modelInfo };
  } catch (error) {
    return { allModelsExist: false, modelInfo: null, error: error.message };
  }
};

exports.getModelStatus = async (req, res) => {
  try {
    const { allModelsExist, modelInfo, error } = await checkExistingModels();
    const datasetSize = await GestureSample.countDocuments();
    
    res.json({
      hasPreTrainedModel: allModelsExist,
      modelInfo,
      datasetSize,
      error,
      recommendation: allModelsExist 
        ? 'Pre-trained model found. You can use it directly or retrain if needed.'
        : 'No pre-trained model found. Training is required.'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check model status',
      details: error.message 
    });
  }
};

exports.startTraining = async (req, res) => {
  if (activeProcess) {
    return res
      .status(409)
      .json({ message: 'Training is already running. Please wait.' });
  }

  // Check if models already exist
  const { allModelsExist, modelInfo } = await checkExistingModels();
  const forceRetrain = req.body?.forceRetrain === true;

  if (allModelsExist && !forceRetrain) {
    return res.status(200).json({ 
      success: true,
      message: 'Pre-trained models already exist and are ready to use!',
      modelInfo,
      recommendation: 'Using existing model to save time and resources. Set forceRetrain=true only if you need to retrain.',
      skipTraining: true
    });
  }

  const datasetSize = await GestureSample.countDocuments();
  if (!datasetSize) {
    return res.status(400).json({ message: 'Dataset is empty.' });
  }

  const [poseCounts, typeBreakdown] = await Promise.all([
    GestureSample.aggregate([
      {
        $group: {
          _id: '$pose_label',
          samples: { $sum: 1 },
        },
      },
      { $sort: { samples: -1 } },
    ]),
    GestureSample.aggregate([
      {
        $group: {
          _id: '$gesture_type',
          samples: { $sum: 1 },
        },
      },
    ]),
  ]);

  const run = await GestureTrainingRun.create({
    status: 'running',
    datasetSize,
    poseCounts: poseCounts.map((row) => ({
      pose_label: row._id,
      samples: row.samples,
    })),
    gestureTypeBreakdown: typeBreakdown.reduce(
      (acc, row) => {
        if (row._id === 'static') acc.static = row.samples;
        else if (row._id === 'dynamic') acc.dynamic = row.samples;
        return acc;
      },
      { static: 0, dynamic: 0 }
    ),
    startedAt: new Date(),
    log: [
      {
        level: 'info',
        message: 'Training run created. Preparing dataset...',
      },
    ],
  });

  const tempCsvPath = path.join(
    os.tmpdir(),
    `gesture_dataset_${run._id.toString()}.csv`
  );

  try {
    await exportGesturesToCsv(tempCsvPath);
  } catch (error) {
    await appendLog(run._id, 'error', `Failed to export dataset: ${error}`);
    await GestureTrainingRun.findByIdAndUpdate(run._id, {
      status: 'failed',
      finishedAt: new Date(),
    });
    return res
      .status(500)
      .json({ message: 'Failed to export dataset for training.' });
  }

  const child = spawn(PYTHON_BIN, [TRAIN_SCRIPT, '--dataset', tempCsvPath], {
    cwd: PIPELINE_ROOT,
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
    },
  });
  activeProcess = child;
  activeRunId = run._id;
  cancellationRequested = false;

  child.stdout.on('data', (data) => appendLog(run._id, 'info', data));
  child.stderr.on('data', (data) => appendLog(run._id, 'error', data));

  child.on('error', async (error) => {
    console.error('Training process error:', error);
    activeProcess = null;
    activeRunId = null;
    await fs.unlink(tempCsvPath).catch(() => null);
    await GestureTrainingRun.findByIdAndUpdate(run._id, {
      status: 'failed',
      exitCode: -1,
      finishedAt: new Date(),
      $push: {
        log: {
          level: 'error',
          message: `Training process failed to start: ${error.message}`,
        },
      },
    });
  });

  child.on('close', async (code) => {
    activeProcess = null;
    activeRunId = null;
    await fs.unlink(tempCsvPath).catch(() => null);

    const status =
      !cancellationRequested && code === 0 ? 'completed' : 'failed';
    const summary = parseTrainingSummary(RESULTS_DIR);

    await GestureTrainingRun.findByIdAndUpdate(run._id, {
      status,
      exitCode: code,
      finishedAt: new Date(),
      summary,
      artifactPaths: ARTIFACTS,
      $push: {
        log: {
          level: code === 0 ? 'info' : 'error',
          message:
            !cancellationRequested && code === 0
              ? 'Training completed successfully.'
              : cancellationRequested
              ? 'Training cancelled by user.'
              : `Training failed with exit code ${code}.`,
        },
      },
    });
    cancellationRequested = false;
  });

  res.status(202).json({ runId: run._id });
};

exports.listRuns = async (req, res) => {
  const runs = await GestureTrainingRun.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json(runs);
};

exports.getRun = async (req, res) => {
  const { id } = req.params;
  const run = await GestureTrainingRun.findById(id).lean();
  if (!run) {
    return res.status(404).json({ message: 'Training run not found.' });
  }
  res.json(run);
};

exports.cancelTraining = async (req, res) => {
  const { id } = req.params;

  if (!activeProcess || !activeRunId) {
    // If process already ended, mark run as failed if still running in DB
    const run = await GestureTrainingRun.findById(id);
    if (run && run.status === 'running') {
      await GestureTrainingRun.findByIdAndUpdate(id, {
        status: 'failed',
        finishedAt: new Date(),
        $push: {
          log: {
            level: 'error',
            message: 'Training marked as cancelled (process not active).',
          },
        },
      });
    }
    return res
      .status(409)
      .json({ message: 'No training process is currently running.' });
  }

  if (activeRunId.toString() !== id) {
    return res
      .status(400)
      .json({ message: 'The specified run is not the active training run.' });
  }

  try {
    cancellationRequested = true;
    await appendLog(activeRunId, 'info', 'Cancellation requested by user.');
    activeProcess.kill('SIGTERM');
    res.json({ message: 'Training cancellation requested.' });
  } catch (error) {
    console.error('Failed to cancel training', error);
    res.status(500).json({ message: 'Failed to cancel training process.' });
  }
};
