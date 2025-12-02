const mongoose = require('mongoose');
const Admin = require('../../../src/models/Admin');
const adminController = require('../../../src/controllers/adminController');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  createTestAdminData
} = require('../../helpers/adminHelpers');

// Mock formatAdminDocument nếu cần
jest.mock('../../../src/utils/dateFormatter', () => ({
  formatAdminDocument: doc => doc.toObject ? doc.toObject() : doc,
}));

describe('Admin Controller - getProfile', () => {
  let mockReq, mockRes, admin;

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
    mockRes.status.mockImplementation(code => {
      mockRes.statusCode = code;
      return mockRes;
    });
    mockRes.json.mockImplementation(data => {
      mockRes._json = data;
      return mockRes;
    });
  });

  // TC1: Get profile admin thành công
  test('TC1: Get profile admin thành công', async () => {
    admin = new Admin(createTestAdminData({ email: 'admin1@test.com', fullName: 'Admin One' }));
    await admin.save();
    mockReq = { params: { id: admin._id.toString() } };

    await adminController.getProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes._json.success).toBe(true);
    expect(mockRes._json.admin).toBeDefined();
    expect(mockRes._json.admin.email).toBe('admin1@test.com');
    expect(mockRes._json.admin.fullName).toBe('Admin One');
    expect(mockRes._json.admin.password).toBeUndefined();
    expect(mockRes._json.admin.temporaryPassword).toBeUndefined();
  });

  // TC2: Fail: do id không tồn tại
  test('TC2: Fail - id không tồn tại', async () => {
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };

    await adminController.getProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC3: Fail: do id không đúng định dạng (Object)
  test('TC3: Fail - id không đúng định dạng (Object)', async () => {
    mockReq = { params: { id: '{invalid_id}' } };

    await adminController.getProfile(mockReq, mockRes);

    // Mongoose sẽ throw CastError, về lỗi server
    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
  });

  // TC4: Fail: do id trống
  test('TC4: Fail - id trống', async () => {
    mockReq = { params: { id: '' } };

    await adminController.getProfile(mockReq, mockRes);

    // findById('') trả về null, nên controller trả về 404
    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC5: Fail: do id null
  test('TC5: Fail - id null', async () => {
    mockReq = { params: { id: null } };

    await adminController.getProfile(mockReq, mockRes);

    // findById(null) trả về null, nên controller trả về 404
    expect(mockRes.statusCode).toBe(404);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Admin not found/i);
  });

  // TC6: Fail: chỉ get được User (không get được profile User, Return Exception)
  test('TC6: Fail - chỉ get được User (return Exception)', async () => {
    // Mock formatAdminDocument ném lỗi khi không đủ field
    jest.mock('../../../src/utils/dateFormatter', () => ({
      formatAdminDocument: () => { throw new Error('Format error'); }
    }));
    admin = new Admin(createTestAdminData({ email: 'admin2@test.com' }));
    await admin.save();
    mockReq = { params: { id: admin._id.toString() } };

    await adminController.getProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    // Restore mock sau test
    jest.resetModules();
  });

  // TC7: Fail: lỗi server (Mongoose lỗi DB)
  test('TC7: Fail - lỗi server', async () => {
    jest.spyOn(Admin, 'findById').mockImplementationOnce(() => { throw new Error('Fake DB error'); });
    mockReq = { params: { id: mongoose.Types.ObjectId().toString() } };

    await adminController.getProfile(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes._json.success).toBe(false);
    expect(mockRes._json.message).toMatch(/Server error/i);
    jest.restoreAllMocks();
  });
});