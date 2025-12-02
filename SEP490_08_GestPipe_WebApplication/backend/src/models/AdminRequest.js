const mongoose = require('mongoose');

const AdminRequestSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  requestStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestMessage: {
    type: String,
    trim: true,
    maxlength: 500
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // createdAt, updatedAt
});

const AdminRequest = mongoose.model('AdminRequest', AdminRequestSchema);

module.exports = AdminRequest;
