const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category_id: {
    type: mongoose.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  topic_id: {
    type: mongoose.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  records: {
    type: Object,
    default: {},
    required: true
  },
  duration: {
    type: Number, // Double tương ứng Number trong Mongoose
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: "Session"
});

module.exports = mongoose.model("Session", SessionSchema);