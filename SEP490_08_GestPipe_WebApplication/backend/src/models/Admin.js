const mongoose = require('mongoose');
const crypto = require('crypto');

const AdminSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  temporaryPassword: {
    type: String,
    default: null,
    select: false // Không trả về field này khi query (bảo mật)
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  isProfileCompleted: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  uiLanguage: {
    type: String,
    enum: ['en', 'vi'],
    default: 'vi'
  },
  birthday: {
    type: Date
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  province: {
    type: String,
    trim: true
  },
  gesture_request_status: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'enabled'
  }
}, {
  timestamps: true, // Automatically manages createdAt and updatedAt
  collection: 'Admins' // Specify collection name
});

// Hash password before saving using SHA256
AdminSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Hash password
  this.password = crypto.createHash('sha256').update(this.password).digest('hex');
  
  // Hash temporaryPassword if it exists and was modified
  if (this.temporaryPassword && this.isModified('temporaryPassword')) {
    this.temporaryPassword = crypto.createHash('sha256').update(this.temporaryPassword).digest('hex');
  }
  
  next();
});

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
