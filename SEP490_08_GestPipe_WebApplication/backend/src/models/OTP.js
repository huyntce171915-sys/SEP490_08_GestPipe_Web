const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordOTPExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'Otp' // Use existing collection with capital O
});

// Index để query nhanh
OTPSchema.index({ adminId: 1 });
OTPSchema.index({ resetPasswordOTPExpires: 1 }, { expireAfterSeconds: 0 }); // TTL index

const OTP = mongoose.model('OTP', OTPSchema);

module.exports = OTP;