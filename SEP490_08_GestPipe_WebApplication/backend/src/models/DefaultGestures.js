const mongoose = require('mongoose');

const DefaultGestureSchema = new mongoose.Schema({
  version_id: {
    type: mongoose.Types.ObjectId,
    ref: 'GestureVersion',
    required: true
  },
  gesture_type_id: {
    type: mongoose.Types.ObjectId,
    ref: 'GestureType',
    required: true
  },
  pose_label: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: Object,
    default: {},
    required: true
  },
  accuracy: {
    type: Number, // Double tương ứng Number trong JS/Mongoose
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  vector_data: {
    type: Object,
    default: {}
  }
}, {
  collection: "DefaultGestures"
});

module.exports = mongoose.model("DefaultGesture", DefaultGestureSchema);