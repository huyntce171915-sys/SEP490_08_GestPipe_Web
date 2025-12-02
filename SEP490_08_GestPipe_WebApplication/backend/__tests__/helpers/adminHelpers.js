const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Admin = require('../../src/models/Admin');

let mongod;

// Tạo dữ liệu mẫu cho admin (cho test)
function createTestAdminData(override = {}) {
  return {
    fullName: 'Test Admin',
    email: 'testadmin@example.com',
    password: 'testPass123',
    temporaryPassword: 'tempPass123',
    role: 'admin',
    accountStatus: 'active',
    theme: 'dark',
    uiLanguage: 'vi',
    phoneNumber: '0123456789',
    province: 'Hanoi',
    birthday: new Date('1990-01-01'),
    gesture_request_status: 'enabled',
    resetPasswordOTP: null,
    resetPasswordOTPExpires: null,
    ...override // cho phép ghi đè bất kỳ field nào khi test
  };
}

// Hash mật khẩu (dùng chuẩn controller)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

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
 * Format lại admin (bỏ các field nhạy cảm giống controller)
 */
function formatAdminDocument(doc) {
  if (!doc) return null;
  // Clone document là object
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.password;
  delete obj.temporaryPassword;
  delete obj.resetPasswordOTP;
  delete obj.resetPasswordOTPExpires;
  return obj;
}

module.exports = {
  createTestAdminData,
  hashPassword,
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  formatAdminDocument,
};