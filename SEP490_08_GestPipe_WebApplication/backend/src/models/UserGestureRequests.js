const mongoose = require('mongoose');

const UserGestureRequestSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user_gesture_config_id: {
    type: mongoose.Types.ObjectId,
    ref: 'UserGestureConfig',
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
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: "usergesturerequests"
});

module.exports = mongoose.model("UserGestureRequest", UserGestureRequestSchema);