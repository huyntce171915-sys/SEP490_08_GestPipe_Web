const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  account_status: {
    type: String,
    enum: ["inactive", "activeonline", "activeoffline", "pending", "blocked"],
    default: "inactive"
  },
  gesture_request_status: {
    type: String,
    default: ""
  },
  ui_language: {
    type: String
  },
  avatar_url: {
    type: String,
    default: ""
  },
  request_count_today: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_login: {
    type: Date
  },
  version_gesture_id: {
    type: mongoose.Types.ObjectId,
    ref: "GestureVersion"
  },
  auth_provider: {
    type: String
  },
  provider_id: {
    type: String
  },
  email_verified: {
    type: Boolean,
    default: false
  }
}, {
  collection: "Users", // Đặt tên collection
});

module.exports = mongoose.model("User", UserSchema);