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
      enum: ['pending', 'accept', 'reject'],
      default: 'pending',
    },
    artifactPaths: {
      compactCsv: String,
      balancedCsv: String,
      modelsDir: String,
      rawDataDir: String,
    },
    rejectReason: {
      type: String,
      default: '',
    },
    lastRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomGestureRequest',
    },
  },
  { 
    timestamps: true,
    collection: 'customgesturerequests'
  }
);

module.exports = mongoose.model('AdminCustomGesture', AdminCustomGestureSchema);
