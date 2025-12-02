const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Version = require('../../src/models/Version');

let mongod;

/**
 * Tạo dữ liệu version test cơ bản (cho phép ghi đè từng field)
 */
const createTestVersionData = (overrides = {}) => ({
  name: 'Gestpipe.v1.20',
  release_name: 'Gestpipe Public V1',
  description: { features: ['AI', 'Realtime'], text: 'First public release' },
  release_date: new Date('2025-11-21'),
  downloads: 100,
  accuracy: 94.5,
  status: 'active',
  model_path: '/models/gestpipe-v1.20.pt',
  admin_id: overrides.admin_id || new mongoose.Types.ObjectId(), // default random id
  created_at: new Date(),
  ...overrides,
});

/**
 * Tạo version test (new, chưa lưu vào DB)
 */
function makeVersion(overrides = {}) {
  return new Version(createTestVersionData(overrides));
}

/**
 * Tạo và lưu version test vào DB
 */
async function createVersion(overrides = {}) {
  const version = new Version(createTestVersionData(overrides));
  await version.save();
  return version;
}

/**
 * Kết nối tới db test memory-server
 */
async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

/**
 * Ngắt kết nối và xoá memory db
 */
async function disconnectTestDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

/**
 * Xoá sạch dữ liệu version
 */
async function clearDatabase() {
  await Version.deleteMany({});
}

module.exports = {
  createTestVersionData,
  makeVersion,
  createVersion,
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
};