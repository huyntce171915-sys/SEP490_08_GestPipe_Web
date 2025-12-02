const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * Hash password using SHA256 (dùng giống như authController)
 */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Tạo dữ liệu admin test cơ bản
 * - Có thể truyền overrides để tạo trạng thái, password, otp khác nhau
 */
const createTestAdminData = (overrides = {}) => ({
  fullName: 'Test Admin',
  email: 'testadmin@test.com',
  password: 'testpassword123', // password dạng plain text, sẽ được hook của model hash lại khi save
  role: 'admin',
  accountStatus: 'active',
  theme: 'light',
  uiLanguage: 'vi',
  isFirstLogin: false,
  gesture_request_status: 'enabled',
  resetPasswordOTP: null,
  resetPasswordOTPExpires: null,
  ...overrides,
});

/**
 * Tạo admin có otp đang active để test verify/forgot password
 */
const createAdminWithOTP = ({
  email = 'otpadmin@test.com',
  otp = '123456',
  otpExpires = new Date(Date.now() + 5 * 60 * 1000), // 5 phút nữa
  ...overrides
} = {}) => ({
  fullName: 'OTP Admin',
  email,
  password: 'somepassword123',
  role: 'admin',
  accountStatus: 'active',
  theme: 'light',
  uiLanguage: 'vi',
  isFirstLogin: false,
  gesture_request_status: 'enabled',
  resetPasswordOTP: otp,
  resetPasswordOTPExpires: otpExpires,
  ...overrides,
});

/**
 * Xoá sạch dữ liệu trong mọi collection (gọi trong beforeEach cho isolation test)
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Kết nối tới in-memory test database (đã setup MONGO_URI với mongodb-memory-server)
 */
const connectTestDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
};

/**
 * Ngắt kết nối DB (cleanup)
 */
const disconnectTestDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error disconnecting from test database:', error);
    throw error;
  }
};

module.exports = {
  hashPassword,
  createTestAdminData,
  createAdminWithOTP,
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
};