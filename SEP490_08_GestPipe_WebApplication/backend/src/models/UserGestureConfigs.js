const mongoose = require('mongoose');

const UserGestureConfigSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId, // Sửa thành ObjectId tham chiếu User
    ref: 'User',
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
  update_at: {
    type: Date,
    default: Date.now
  },
  vector_data: {
    type: Object,
    default: {}
  }
}, {
  collection: "usergestureconfigs"
});

module.exports = mongoose.model("UserGestureConfig", UserGestureConfigSchema);