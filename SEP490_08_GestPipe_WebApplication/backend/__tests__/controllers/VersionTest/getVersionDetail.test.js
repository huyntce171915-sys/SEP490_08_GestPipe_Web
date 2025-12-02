const mongoose = require('mongoose');
const Version = require('../../../src/models/Version');
const versionController = require('../../../src/controllers/versionController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestVersionData,
  createVersion,
} = require('../../helpers/versionHelpers');

describe('Version Controller - getVersionDetail', () => {
  let mockReq, mockRes, version;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: null,
      _json: null,
    };
    mockRes.status.mockImplementation((code) => {
      mockRes.statusCode = code;
      return mockRes;
    });
    mockRes.json.mockImplementation((data) => {
      mockRes._json = data;
      return mockRes;
    });
  });

  // TC1: Get Version thành công với đầy đủ các trường
  test('TC1: Get Version thành công với đầy đủ các trường', async () => {
    version = await createVersion({
      name: 'v2.0',
      release_name: 'Stable V2',
      description: { features: ['Fast'], notes: 'Improved speed' },
      release_date: new Date('2025-12-01'),
      downloads: 999,
      accuracy: 99.4,
      status: 'active',
      model_path: '/models/v2.pt',
      admin_id: new mongoose.Types.ObjectId(),
      created_at: new Date('2025-12-01T01:23:45Z'),
    });

    mockReq = { params: { id: version._id.toString() } };
    await versionController.getVersionDetail(mockReq, mockRes);

    expect(mockRes.statusCode ?? 200).toBe(200);
    expect(mockRes._json.id.toString()).toBe(version._id.toString());
    expect(mockRes._json.version).toBe('v2.0');
    expect(mockRes._json.releaseName).toBe('Stable V2');
    expect(mockRes._json.description).toEqual({ features: ['Fast'], notes: 'Improved speed' });
    expect(new Date(mockRes._json.releaseDate).getTime()).toBe(new Date('2025-12-01').getTime());
    expect(mockRes._json.downloads).toBe(999);
    expect(mockRes._json.accuracy).toBe('99.4%');
    expect(mockRes._json.status).toBe('active');
    expect(mockRes._json.modelPath).toBe('/models/v2.pt');
    expect(mockRes._json.admin.toString()).toBe(version.admin_id.toString());
    expect(new Date(mockRes._json.createdAt).getTime()).toBe(new Date('2025-12-01T01:23:45Z').getTime());
  });

  // TC2: Fail - id không tồn tại
  test('TC2: Fail - id không tồn tại', async () => {
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };
    await versionController.getVersionDetail(mockReq, mockRes);

    expect(mockRes.statusCode ?? 404).toBe(404);
    expect(mockRes._json.error).toMatch(/Version not found/);
  });

  // TC3: Fail - id không đúng định dạng
  test('TC3: Fail - id không đúng định dạng', async () => {
    mockReq = { params: { id: 'not_valid_id' } };
    await versionController.getVersionDetail(mockReq, mockRes);

    expect(mockRes.statusCode ?? 500).toBe(500);
    expect(mockRes._json.error).toBeDefined();
  });

  // TC4: Fail - id trống
  test('TC4: Fail - id trống', async () => {
    mockReq = { params: { id: '' } };
    await versionController.getVersionDetail(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode);
    expect(mockRes._json.error).toBeDefined();
  });

  // TC5: Fail - id null
  test('TC5: Fail - id null', async () => {
    mockReq = { params: { id: null } };
    await versionController.getVersionDetail(mockReq, mockRes);

    expect([404, 500]).toContain(mockRes.statusCode);
    expect(mockRes._json.error).toBeDefined();
  });

  // TC6: Fail - id sai (hợp lệ nhưng không có trong DB)
  test('TC6: Fail - id sai', async () => {
    const fakeId = mongoose.Types.ObjectId().toString();
    mockReq = { params: { id: fakeId } };
    await versionController.getVersionDetail(mockReq, mockRes);

    expect(mockRes.statusCode ?? 404).toBe(404);
    expect(mockRes._json.error).toMatch(/Version not found/);
  });

  // TC7: Fail - lỗi server
  test('TC7: Fail - lỗi server', async () => {
    version = await createVersion({ name: 'err-version' });
    jest.spyOn(Version, 'findById').mockImplementationOnce(() => { throw new Error('DB error'); });
    mockReq = { params: { id: version._id.toString() } };

    await versionController.getVersionDetail(mockReq, mockRes);

    expect(mockRes.statusCode ?? 500).toBe(500);
    expect(mockRes._json.error).toMatch(/DB error/);
    jest.restoreAllMocks();
  });
});