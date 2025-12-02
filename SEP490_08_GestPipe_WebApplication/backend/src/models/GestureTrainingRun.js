const mongoose = require('mongoose');

const gestureTrainingRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    datasetSize: Number,
    poseCounts: [
      {
        pose_label: String,
        samples: Number,
      },
    ],
    gestureTypeBreakdown: {
      static: { type: Number, default: 0 },
      dynamic: { type: Number, default: 0 },
    },
    log: [
      {
        at: { type: Date, default: Date.now },
        level: { type: String, enum: ['info', 'error'], default: 'info' },
        message: String,
      },
    ],
    summary: {
      averageCvF1: Number,
      averageTestF1: Number,
      bestHyperparams: [
        {
          pose_label: String,
          best_kernel: String,
          best_C: Number,
          best_gamma: String,
          test_f1_score: Number,
        },
      ],
    },
    startedAt: Date,
    finishedAt: Date,
    exitCode: Number,
    artifactPaths: {
      model: String,
      scaler: String,
      staticDynamicClassifier: String,
      summaryCsv: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GestureTrainingRun', gestureTrainingRunSchema);
