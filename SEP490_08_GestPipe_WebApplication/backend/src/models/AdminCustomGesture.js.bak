const mongoose = require('mongoose');

const AdminCustomGestureSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      unique: true,
      required: true,
    },
    gestures: {
      type: [String],
      required: true,
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'failed'],
      default: 'draft',
    },
    artifactPaths: {
      compactCsv: String,
      balancedCsv: String,
      modelsDir: String,
      rawDataDir: String,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    lastRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomGestureRequest',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminCustomGesture', AdminCustomGestureSchema);
