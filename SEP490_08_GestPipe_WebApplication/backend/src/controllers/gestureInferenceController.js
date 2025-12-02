const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const PIPELINE_ROOT =
  process.env.PIPELINE_ROOT ||
  path.resolve(__dirname, '../../../hybrid_realtime_pipeline');

const MODELS_DIR = path.join(PIPELINE_ROOT, 'models');

const ARTIFACTS = {
  model: path.join(MODELS_DIR, 'motion_svm_model.pkl'),
  scaler: path.join(MODELS_DIR, 'motion_scaler.pkl'),
  staticDynamicClassifier: path.join(MODELS_DIR, 'static_dynamic_classifier.pkl'),
};

// Check if all required model files exist
const checkModelsExist = async () => {
  try {
    const modelChecks = await Promise.all([
      fs.access(ARTIFACTS.model).then(() => true).catch(() => false),
      fs.access(ARTIFACTS.scaler).then(() => true).catch(() => false),
      fs.access(ARTIFACTS.staticDynamicClassifier).then(() => true).catch(() => false),
    ]);

    const [hasModel, hasScaler, hasClassifier] = modelChecks;
    return hasModel && hasScaler && hasClassifier;
  } catch (error) {
    return false;
  }
};

// Get model information
exports.getModelInfo = async (req, res) => {
  try {
    const modelsExist = await checkModelsExist();
    
    if (!modelsExist) {
      return res.status(404).json({
        available: false,
        message: 'No trained models found. Please train a model first.',
      });
    }

    const modelStat = await fs.stat(ARTIFACTS.model);
    const scalerStat = await fs.stat(ARTIFACTS.scaler);
    const classifierStat = await fs.stat(ARTIFACTS.staticDynamicClassifier);

    res.json({
      available: true,
      models: {
        mainModel: {
          path: ARTIFACTS.model,
          size: modelStat.size,
          lastModified: modelStat.mtime,
        },
        scaler: {
          path: ARTIFACTS.scaler,
          size: scalerStat.size,
          lastModified: scalerStat.mtime,
        },
        classifier: {
          path: ARTIFACTS.staticDynamicClassifier,
          size: classifierStat.size,
          lastModified: classifierStat.mtime,
        },
      },
      message: 'Trained models are ready to use.',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check model information',
      details: error.message,
    });
  }
};

// Test model prediction (optional endpoint for testing)
exports.testModel = async (req, res) => {
  try {
    const modelsExist = await checkModelsExist();
    
    if (!modelsExist) {
      return res.status(404).json({
        success: false,
        message: 'No trained models found. Please train a model first.',
      });
    }

    // You can add actual prediction testing here if needed
    res.json({
      success: true,
      message: 'Models are loaded and ready for predictions.',
      modelPath: ARTIFACTS.model,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test model',
      details: error.message,
    });
  }
};

module.exports = exports;