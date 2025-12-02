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

describe('Version Controller - getAllVersions', () => {
  let mockReq, mockRes;

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

  // TC1: Get all version thành công
  test('TC1: Get all version thành công', async () => {
    const v1 = await createVersion({ name: 'v1.1', release_name: 'Alpha', downloads: 123, accuracy: 90.0, status: 'active' });
    const v2 = await createVersion({ name: 'v1.2', release_name: 'Beta', downloads: 456, accuracy: 93.2, status: 'inactive' });

    mockReq = {};
    await versionController.getAllVersions(mockReq, mockRes);

    expect(mockRes.statusCode ?? 200).toBe(200);
    expect(mockRes._json.versions).toBeDefined();
    expect(Array.isArray(mockRes._json.versions)).toBe(true);
    expect(mockRes._json.versions.length).toBe(2);

    // Sorting should be by release_date desc
    const sorted = [...mockRes._json.versions]
      .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    expect(mockRes._json.versions[0].release_date).toStrictEqual(sorted[0].release_date);

    // Check fields
    const names = mockRes._json.versions.map(v => v.version);
    expect(names).toContain('v1.1');
    expect(names).toContain('v1.2');
  });

  // TC2: Get all version thành công trả về empty khi DB trống
  test('TC2: Get all version thành công trả về empty khi DB trống', async () => {
    mockReq = {};
    await versionController.getAllVersions(mockReq, mockRes);

    expect(mockRes.statusCode ?? 200).toBe(200);
    expect(mockRes._json.versions).toBeDefined();
    expect(Array.isArray(mockRes._json.versions)).toBe(true);
    expect(mockRes._json.versions.length).toBe(0);
  });

  // TC3: Fail - do lỗi server
  test('TC3: Fail - do lỗi server', async () => {
    jest.spyOn(Version, 'find').mockImplementationOnce(() => { throw new Error('Fake DB error'); });

    mockReq = {};
    await versionController.getAllVersions(mockReq, mockRes);

    expect(mockRes.statusCode ?? 500).toBe(500);
    expect(mockRes._json.error).toMatch(/Fake DB error/);
    jest.restoreAllMocks();
  });
});