const mongoose = require('mongoose');

const CustomGestureRequestSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  gestures: {
    type: [String],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected', 'failed'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  artifactPaths: {
    compactCsv: String,
    balancedCsv: String,
    modelsDir: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('CustomGestureRequest', CustomGestureRequestSchema);
