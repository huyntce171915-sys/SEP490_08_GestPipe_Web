const mongoose = require('mongoose');

const gestureStatusSchema = new mongoose.Schema({
  gestureId: {
    type: String, // Sử dụng string cho gesture name thay vì ObjectId
    required: true
  },
  gestureName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ready', 'customed', 'blocked'],
    default: 'ready'
  },
  customedAt: {
    type: Date
  },
  blockedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  }
});

const adminGestureRequestSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true,
    index: true
  },
  gestures: [gestureStatusSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: "AdminGestureRequests"
});

// Update updatedAt khi save
adminGestureRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method để tạo record mới cho admin với 14 gestures mặc định
adminGestureRequestSchema.statics.createForAdmin = async function(adminId) {
  const defaultGestures = [
    { gestureId: 'end', gestureName: 'End', status: 'ready' },
    { gestureId: 'end_present', gestureName: 'End Present', status: 'ready' },
    { gestureId: 'home', gestureName: 'Home', status: 'ready' },
    { gestureId: 'next_slide', gestureName: 'Next Slide', status: 'ready' },
    { gestureId: 'previous_slide', gestureName: 'Previous Slide', status: 'ready' },
    { gestureId: 'rotate_down', gestureName: 'Rotate Down', status: 'ready' },
    { gestureId: 'rotate_left', gestureName: 'Rotate Left', status: 'ready' },
    { gestureId: 'rotate_right', gestureName: 'Rotate Right', status: 'ready' },
    { gestureId: 'rotate_up', gestureName: 'Rotate Up', status: 'ready' },
    { gestureId: 'start_present', gestureName: 'Start Present', status: 'ready' },
    { gestureId: 'zoom_in', gestureName: 'Zoom In', status: 'ready' },
    { gestureId: 'zoom_in_slide', gestureName: 'Zoom In Slide', status: 'ready' },
    { gestureId: 'zoom_out', gestureName: 'Zoom Out', status: 'ready' },
    { gestureId: 'zoom_out_slide', gestureName: 'Zoom Out Slide', status: 'ready' }
  ];

  const request = new this({
    adminId,
    gestures: defaultGestures
  });

  return request.save();
};

module.exports = mongoose.model('AdminGestureRequest', adminGestureRequestSchema);