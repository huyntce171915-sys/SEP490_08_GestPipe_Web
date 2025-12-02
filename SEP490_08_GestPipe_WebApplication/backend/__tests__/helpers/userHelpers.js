const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');
const UserProfile = require('../../src/models/UserProfile');

let mongod;

// Hash password với SHA256 (để khớp với password_hash ở model/user)
const hashPassword = (plain) =>
  crypto.createHash('sha256').update(plain).digest('hex');

// Tạo user mẫu, cho phép ghi đè field tuỳ ý
const createTestUserData = (overrides = {}) => ({
  email: 'testuser@test.com',
  password_hash: hashPassword('abc123test'),
  account_status: 'activeonline',
  gesture_request_status: '',
  ui_language: 'vi',
  avatar_url: '',
  request_count_today: 0,
  created_at: new Date(),
  last_login: null,
  version_gesture_id: undefined,
  auth_provider: 'local',
  provider_id: '',
  email_verified: true,
  ...overrides,
});

// Tạo UserProfile mẫu, cho phép ghi đè field tuỳ ý
const createTestUserProfileData = (overrides = {}) => ({
  user_id: overrides.user_id,
  full_name: 'Test User',
  profile_image: '',
  updated_at: new Date(),
  occupation: 'Student',
  company: 'UIT',
  birth_date: new Date('2001-08-20'),
  education_level: 'Bachelor',
  phone_number: '0123456789',
  gender: 'male',
  address: 'UIT HCM',
  ...overrides,
});

// Kết nối tới db test memory-server
async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

// Ngắt kết nối DB và xóa memory server
async function disconnectTestDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

// Xoá sạch dữ liệu test User & UserProfile
async function clearDatabase() {
  await User.deleteMany({});
  await UserProfile.deleteMany({});
}

// Helper tạo user + profile và trả về object nhiều tiện ích cho test
async function createUserWithProfile(userOverrides = {}, profileOverrides = {}) {
  const userData = createTestUserData(userOverrides);
  const user = new User(userData);
  await user.save();

  // Nếu muốn gán user_id cho profile phải lấy từ user._id vừa tạo
  const profileData = createTestUserProfileData({ user_id: user._id, ...profileOverrides });
  const profile = new UserProfile(profileData);
  await profile.save();

  return { user, profile };
}

// Helper tạo user (chỉ user, không profile)
async function createUserOnly(userOverrides = {}) {
  const userData = createTestUserData(userOverrides);
  const user = new User(userData);
  await user.save();
  return user;
}

// Helper tạo profile (chỉ profile, không user)
async function createProfileOnly(profileOverrides = {}) {
  const profileData = createTestUserProfileData(profileOverrides);
  const profile = new UserProfile(profileData);
  await profile.save();
  return profile;
}

// Xuất các hàm cho test dùng
module.exports = {
  hashPassword,
  createTestUserData,
  createTestUserProfileData,
  createUserWithProfile,
  createUserOnly,
  createProfileOnly,
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
};